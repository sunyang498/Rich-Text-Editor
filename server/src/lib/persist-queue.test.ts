/**
 * 落库队列回归测试（node:test）
 *
 * 覆盖评审提出的三个 P0：
 *  P0-1 落库失败不得静默丢数据（回队 + 重试）
 *  P0-2 定时器回调失败不得导致进程崩溃（不允许 unhandledRejection）
 *  P0-3 退出时单个文档失败不得阻塞其他文档（allSettled 语义）
 *
 * 运行：npm --prefix server run test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistQueue } from './persist-queue';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 简单合并：按顺序拼接字节（便于断言顺序）；生产用 Y.mergeUpdates */
const concatMerge = (updates: Uint8Array[]): Uint8Array =>
  Uint8Array.from(updates.flatMap((u) => Array.from(u)));

const bytes = (...nums: number[]) => Uint8Array.from(nums);

test('窗口内多次入队 → 合并为一次 append', async () => {
  const appends: Array<{ doc: string; payload: number[] }> = [];
  const q = createPersistQueue({
    append: async (doc, update) => {
      appends.push({ doc, payload: Array.from(update) });
    },
    merge: concatMerge,
    flushMs: 20,
  });

  q.enqueue('docA', bytes(1, 1));
  q.enqueue('docA', bytes(2, 2));
  q.enqueue('docA', bytes(3, 3));
  await sleep(60);

  assert.equal(appends.length, 1, '窗口内三次入队应只写库一次');
  assert.deepEqual(appends[0].payload, [1, 1, 2, 2, 3, 3], '合并结果应保持入队顺序');
  assert.deepEqual(q.pendingDocs(), [], '成功落库后队列应清空');
  q.dispose();
});

test('P0-1/P0-2：写入失败回队重试，数据不丢且进程不崩', async () => {
  let attempt = 0;
  const succeeded: number[][] = [];
  const errors: string[] = [];
  const q = createPersistQueue({
    append: async (_doc, update) => {
      attempt += 1;
      if (attempt === 1) throw new Error('DB down'); // 第一次失败
      succeeded.push(Array.from(update));
    },
    merge: concatMerge,
    flushMs: 10,
    retryBaseMs: 5,
    maxRetry: 3,
    onError: (m) => errors.push(m),
  });

  q.enqueue('docA', bytes(7));
  await sleep(120); // 覆盖首次失败 + 退避重试成功

  assert.equal(attempt, 2, '应重试一次');
  assert.deepEqual(succeeded, [[7]], '重试成功后应落库同一批增量');
  assert.deepEqual(q.pendingDocs(), [], '重试成功后队列应清空');
  assert.equal(errors.length, 0, '重试成功不应上报告警');
  q.dispose();
});

test('P0-1：失败批次回队首，重放顺序正确（旧批次在新批次之前）', async () => {
  let attempt = 0;
  const succeeded: number[][] = [];
  const q = createPersistQueue({
    append: async (_doc, update) => {
      attempt += 1;
      if (attempt === 1) {
        await sleep(20); // 模拟慢失败，期间会有新增量入队
        throw new Error('slow failure');
      }
      succeeded.push(Array.from(update));
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 5,
    maxRetry: 3,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(15); // 首次 flush 已开始，正在等待 20ms 的慢失败
  q.enqueue('docA', bytes(2)); // 失败期间的“新增量”
  await sleep(150);

  assert.equal(succeeded.length, 1);
  assert.deepEqual(succeeded[0], [1, 2], '旧批次(1) 必须排在新批次(2) 之前');
  q.dispose();
});

test('P0-3：退出落库用 allSettled，单文档失败不阻塞其他文档', async () => {
  const written: string[] = [];
  const q = createPersistQueue({
    append: async (doc) => {
      if (doc === 'bad') throw new Error('always fail');
      written.push(doc);
    },
    merge: concatMerge,
    flushMs: 10_000, // 不让定时器先触发，只用 flushAll
    retryBaseMs: 1,
    maxRetry: 1,
    onError: () => undefined,
  });

  q.enqueue('bad', bytes(9));
  q.enqueue('good', bytes(8));

  const result = await q.flushAll();

  assert.equal(result.total, 2);
  assert.ok(result.failed >= 1, '失败文档应被计入 failed');
  assert.deepEqual(written, ['good'], '正常文档必须已落库');
  assert.deepEqual(result.pending, ['bad'], '失败文档应保留在内存队列（不丢）');
  q.dispose();
});

test('重试耗尽后仍保留在内存（数据不丢）并上报告警', async () => {
  const errors: string[] = [];
  const q = createPersistQueue({
    append: async () => {
      throw new Error('permanent failure');
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 1,
    maxRetry: 1,
    maxExhaustedRounds: 1, // 首轮耗尽即熔断（便于断言告警文案）
    onError: (m) => errors.push(m),
  });

  q.enqueue('docA', bytes(1));
  await sleep(80);

  assert.deepEqual(q.pendingDocs(), ['docA'], '重试耗尽后增量仍在内存');
  assert.ok(
    errors.some((m) => m.includes('exhausted')),
    '应输出重试耗尽的告警'
  );
  q.dispose();
});

// ============================================================
// Round 3 · T1：退避升级 + 熔断（不允许无界重试）
// ============================================================

test('T1-1 永久失败时不会死循环：1 秒内 append 次数 ≤ 6', async () => {
  let appends = 0;
  const q = createPersistQueue({
    append: async () => {
      appends += 1;
      throw new Error('DB down');
    },
    merge: concatMerge,
    flushMs: 300,
    retryBaseMs: 50,
    maxRetry: 1, // 每轮 2 次尝试
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(1000);

  assert.ok(appends >= 2, '应至少发生一次重试');
  assert.ok(appends <= 6, `1 秒内 append 次数应 ≤ 6，实际 ${appends}（说明退避生效，无死循环）`);
  q.dispose();
});

test('T1-2 达到熔断阈值后不再发起新的 append', async () => {
  let appends = 0;
  const q = createPersistQueue({
    append: async () => {
      appends += 1;
      throw new Error('DB down');
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 1,
    maxRetry: 0,
    maxExhaustedRounds: 3,
    backoffCapMs: 20,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(300); // 足够跑完 3 轮并熔断
  const afterCircuit = appends;
  assert.ok(afterCircuit >= 1, '熔断前应有过尝试');
  assert.deepEqual(q.degradedDocs(), ['docA'], '应进入 degraded 状态');
  assert.deepEqual(q.pendingDocs(), ['docA'], '数据仍保留在内存（不丢）');

  await sleep(300);
  assert.equal(appends, afterCircuit, '熔断后不应再有新的 append 调用');
  q.dispose();
});

test('T1-3 熔断后 enqueue 可恢复重试', async () => {
  let shouldFail = true;
  const succeeded: number[][] = [];
  const q = createPersistQueue({
    append: async (_doc, update) => {
      if (shouldFail) throw new Error('DB down');
      succeeded.push(Array.from(update));
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 1,
    maxRetry: 0,
    maxExhaustedRounds: 2,
    backoffCapMs: 10,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(200);
  assert.deepEqual(q.degradedDocs(), ['docA'], '应先进入熔断');

  shouldFail = false;
  q.enqueue('docA', bytes(2)); // 客户端仍在编辑 → 应清熔断并重试
  await sleep(200);

  assert.deepEqual(q.degradedDocs(), [], 'enqueue 后应退出 degraded');
  assert.deepEqual(q.pendingDocs(), [], '恢复后应落库成功');
  assert.deepEqual(succeeded, [[1, 2]], '应把熔断期间积压的增量一起落库');
  q.dispose();
});

test('T1-4 续排延迟随耗尽轮次递增', async () => {
  const timestamps: number[] = [];
  const q = createPersistQueue({
    append: async () => {
      timestamps.push(Date.now());
      throw new Error('DB down');
    },
    merge: concatMerge,
    flushMs: 10,
    retryBaseMs: 1,
    maxRetry: 0,
    maxExhaustedRounds: 6,
    backoffCapMs: 400,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(500);

  assert.ok(timestamps.length >= 3, `应至少发生 3 轮，实际 ${timestamps.length}`);
  const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  assert.ok(
    gaps[gaps.length - 1] >= gaps[0] * 2,
    `退避应递增：gaps=${JSON.stringify(gaps)}`
  );
  q.dispose();
});

// ============================================================
// Round 3 · T2：内存队列上限（拒收而非丢弃）
// ============================================================

test('T2-1 超过内存上限后拒收新增量', async () => {
  const q = createPersistQueue({
    append: async () => undefined,
    merge: concatMerge,
    flushMs: 5000, // 不让定时器先落库，保持队列占用
    maxTotalBytes: 10,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1, 2, 3, 4, 5, 6)); // 6 字节
  q.enqueue('docB', bytes(1, 2, 3, 4, 5, 6)); // 再来 6 字节 → 12 > 10 → 拒收

  assert.deepEqual(q.pendingDocs(), ['docA'], '超限的文档不应入队');
  assert.equal(q.totalBytes(), 6, '字节计数只统计已入队数据');
  q.dispose();
});

test('T2-2 超限告警只上报一次', async () => {
  const errors: string[] = [];
  const q = createPersistQueue({
    append: async () => undefined,
    merge: concatMerge,
    flushMs: 5000,
    maxTotalBytes: 4,
    onError: (m) => errors.push(m),
  });

  q.enqueue('docA', bytes(1, 2, 3, 4));
  q.enqueue('docB', bytes(1)); // 超限
  q.enqueue('docC', bytes(1)); // 仍超限
  q.enqueue('docD', bytes(1)); // 仍超限

  assert.equal(
    errors.filter((m) => m.includes('memory cap')).length,
    1,
    `超限告警应只出现一次，实际 ${JSON.stringify(errors)}`
  );
  q.dispose();
});

test('T2-3 落库成功后字节计数归零', async () => {
  const q = createPersistQueue({
    append: async () => undefined,
    merge: concatMerge,
    flushMs: 10,
    maxTotalBytes: 1024,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1, 2, 3));
  q.enqueue('docB', bytes(4, 5));
  assert.equal(q.totalBytes(), 5);

  await sleep(120);
  assert.equal(q.totalBytes(), 0, '全部落库后字节计数应归零');
  assert.deepEqual(q.pendingDocs(), []);
  q.dispose();
});

// ============================================================
// Round 3 · T3：flushAll 边界与统计口径
// ============================================================

test('T3-1 flushAll 命中在飞的 timer 任务时，第二次尽力仍能落库', async () => {
  let attempt = 0;
  const succeeded: number[][] = [];
  const q = createPersistQueue({
    append: async (_doc, update) => {
      attempt += 1;
      if (attempt === 1) {
        await sleep(30); // 慢失败：让 flushAll 撞上在飞任务
        throw new Error('slow failure');
      }
      succeeded.push(Array.from(update));
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 1,
    maxRetry: 1,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(7));
  await sleep(10); // timer 已触发，in-flight 正在慢失败中

  const result = await q.flushAll();

  assert.ok(result.total >= 1, 'total 应统计到该文档');
  assert.deepEqual(succeeded, [[7]], '第二次尽力应完成落库');
  assert.deepEqual(result.pending, [], '最终不应残留');
  q.dispose();
});

test('T3-2 FlushResult 统计口径：total 为去重后的累计文档数，retried 单独计数', async () => {
  const q = createPersistQueue({
    append: async (doc) => {
      if (doc === 'bad') throw new Error('always fail');
    },
    merge: concatMerge,
    flushMs: 5000,
    retryBaseMs: 1,
    maxRetry: 0,
    onError: () => undefined,
  });

  q.enqueue('good', bytes(1));
  q.enqueue('bad', bytes(2));

  const result = await q.flushAll();

  assert.equal(result.total, 2, 'total 应为去重后的文档数');
  assert.equal(result.retried, 1, 'retried 应为第二次尽力处理的文档数');
  assert.ok(result.failed >= 1);
  assert.deepEqual(result.pending, ['bad']);
  q.dispose();
});

// ============================================================
// Round 3 · T4：单飞（I5）直接断言
// ============================================================

test('T4 并发触发（两次定时器 flush 同一文档）只允许一次 append 在飞', async () => {
  // 说明：flushAll 会先 await 在飞任务（T3-1 的修复），因此它本身不会造成并发；
  // 真正的并发窗口是「第一批在飞时，第二批的窗口到期」。用两次 enqueue 的间隔构造该窗口。
  let concurrent = 0;
  let maxConcurrent = 0;
  let calls = 0;
  const appends: number[][] = [];

  const q = createPersistQueue({
    append: async (_doc, update) => {
      calls += 1;
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await sleep(40);
      appends.push(Array.from(update));
      concurrent -= 1;
    },
    merge: concatMerge,
    flushMs: 5,
    retryBaseMs: 1,
    maxRetry: 1,
    onError: () => undefined,
  });

  q.enqueue('docA', bytes(1));
  await sleep(12); // 第一批已进入 append（在飞），此时队列已空
  q.enqueue('docA', bytes(2)); // 第二批入队，5ms 后窗口到期

  await sleep(200);

  assert.equal(maxConcurrent, 1, '同一文档不得并发写库（I5）');
  assert.equal(calls, 2, `两批应串行落库共 2 次 append，实际 ${calls}`);
  assert.deepEqual(appends, [[1], [2]], '落库顺序必须保持 1 → 2');
  assert.deepEqual(q.pendingDocs(), []);
  q.dispose();
});
