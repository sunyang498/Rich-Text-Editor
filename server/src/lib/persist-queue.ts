/**
 * 增量落库队列（append-only + 固定窗口防抖 + 失败回队重试）
 *
 * 为什么单独成模块：
 * - 这段逻辑是"内容不丢"的唯一保障，必须能被单测覆盖（注入 append 失败即可验证）；
 * - 与 Hocuspocus 解耦，将来换协同实现或做快照压缩时只改这里。
 *
 * 不变式（Invariants）：
 *  I1. 任何时刻，一条 update 要么在 `pending` 队列里，要么已成功 append —— 不存在"两边都没有"的窗口。
 *  I2. 失败批次回队时**放队首**：保证"先产生的事务先落库"（Yjs 能收敛乱序，但重放顺序乱会影响排查与快照语义）。
 *  I3. 定时器回调必须自带 catch：否则一次 DB 失败会变成 unhandledRejection（Node 15+ 默认终止进程）。
 *  I4. 进程退出用 allSettled：单个文档落库失败不得阻塞其他文档。
 *  I5. **同一文档同一时刻只能有一次在飞的落库**（single-flight）：
 *      否则“旧批次慢失败 + 新批次快成功”会让新数据先落库，重放顺序错乱。
 *  I6. **退避延迟随耗尽轮次增长，且存在熔断上限**：不允许无界重试。
 *      耗尽轮次达到 maxExhaustedRounds 后停止自动续排（数据保留，等下一次 enqueue 恢复）。
 *  I7. **内存队列有上限；超限时拒收而非丢弃**：宁可拒绝新编辑，也不能把进程撑死（OOM 会连已排队数据一起丢）。
 */

export interface PersistQueueDeps {
  /** 真正的持久化动作（生产=写 y_doc_updates；测试可注入失败） */
  append: (documentId: string, update: Uint8Array) => Promise<void>
  /** 多批增量合并（生产=Y.mergeUpdates；测试可注入简单拼接） */
  merge: (updates: Uint8Array[]) => Uint8Array
  /** 固定窗口（ms），默认 300 */
  flushMs?: number
  /** 最大重试次数，默认 3 */
  maxRetry?: number
  /** 指数退避基数（ms），默认 500 */
  retryBaseMs?: number
  /** 耗尽轮次熔断阀值（默认 20）；达到后停止自动续排 */
  maxExhaustedRounds?: number
  /** 续排退避封顶（ms），默认 30000 */
  backoffCapMs?: number
  /** 内存队列总字节上限（默认 200MB）；超限拒收新增量 */
  maxTotalBytes?: number
  /** 错误上报（默认 console.error） */
  onError?: (message: string, error: unknown) => void
}

export interface FlushResult {
  /** 累计处理过的去重文档数（首轮 + 第二次尽力） */
  total: number
  /** 第二次尽力处理的文档数（监控口径） */
  retried: number
  /** 结束时仍未落库（残留内存）的文档数 */
  failed: number
  /** 仍未落库（残留在内存）的文档 id */
  pending: string[]
}

export interface PersistQueue {
  /** 入队一条增量，并在窗口结束时触发落库 */
  enqueue(documentId: string, update: Uint8Array): void
  /** 立即清空定时器并尽力落库所有文档（进程退出 / 测试用） */
  flushAll(): Promise<FlushResult>
  /** 当前队列中的文档（供监控/测试断言） */
  pendingDocs(): string[]
  /** 当前队列占用字节数（供监控/测试断言） */
  totalBytes(): number
  /** 已熔断（停止自动续排）的文档（供监控/告警） */
  degradedDocs(): string[]
  /** 清空定时器（不落库，仅用于测试收尾） */
  dispose(): void
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function createPersistQueue(deps: PersistQueueDeps): PersistQueue {
  const flushMs = deps.flushMs ?? 300;
  const maxRetry = deps.maxRetry ?? 3;
  const retryBaseMs = deps.retryBaseMs ?? 500;
  const maxExhaustedRounds = deps.maxExhaustedRounds ?? 20;
  const backoffCapMs = deps.backoffCapMs ?? 30_000;
  const maxTotalBytes = deps.maxTotalBytes ?? 200 * 1024 * 1024;
  const onError =
    deps.onError ??
    ((message: string, error: unknown) => console.error(message, error));

  const pending = new Map<string, Uint8Array[]>();
  const timers = new Map<string, NodeJS.Timeout>();
  /** I5：同一文档在飞的落库任务（重复调用直接复用，不并发写） */
  const inFlight = new Map<string, Promise<void>>();
  /** I7：已入队但未成功落库的总字节数 */
  let totalBytes = 0;
  /** I7：超限告警降噪（只在第一次超限时上报） */
  let overCapWarned = false;
  /** I6：每文档累计“耗尽轮次”（一轮 = 一次重试链走到 maxRetry） */
  const exhaustedRounds = new Map<string, number>();
  /** I6：已熔断（停止自动续排）的文档 */
  const degraded = new Set<string>();

  function schedule(documentId: string, delay = flushMs): void {
    if (timers.has(documentId)) return; // 固定窗口：窗口内的多次入队只触发一次
    const timer = setTimeout(() => {
      timers.delete(documentId);
      // I3：必须 catch，避免 unhandledRejection 终止进程
      void flushOne(documentId).catch((e) =>
        onError(`[persist] flush failed: ${documentId}`, e)
      );
    }, delay);
    timers.set(documentId, timer);
  }

  /** 单飞包装：同文档已有在飞任务时复用它，避免并发/乱序写库 */
  function flushOne(
    documentId: string,
    retry = 0,
    mode: 'timer' | 'shutdown' = 'timer'
  ): Promise<void> {
    const running = inFlight.get(documentId);
    if (running) return running;
    const task = doFlush(documentId, retry, mode).finally(() => {
      inFlight.delete(documentId);
    });
    inFlight.set(documentId, task);
    return task;
  }

  async function doFlush(
    documentId: string,
    retry: number,
    mode: 'timer' | 'shutdown'
  ): Promise<void> {
    const updates = pending.get(documentId);
    if (!updates?.length) return;

    // I7：用“原始批次字节数”记账（merge 会压缩，用 merged.byteLength 会漂移）
    const batchBytes = updates.reduce((sum, u) => sum + u.byteLength, 0);

    // 先摘下再写（写失败会回队），保证 I1
    pending.delete(documentId);

    let merged: Uint8Array;
    try {
      merged = updates.length === 1 ? updates[0] : deps.merge(updates);
    } catch (e) {
      // 合并异常（理论上不会发生）：整批放回队首，避免静默丢失
      pending.set(documentId, [...updates, ...(pending.get(documentId) ?? [])]);
      throw e;
    }

    try {
      await deps.append(documentId, merged);

      // 成功：释放字节额度、清零耗尽/熔断状态（并降噪：只在退出 degraded 时打一条）
      totalBytes = Math.max(0, totalBytes - batchBytes);
      if (totalBytes < maxTotalBytes) overCapWarned = false;
      exhaustedRounds.delete(documentId);
      if (degraded.delete(documentId)) {
        onError(`[persist] recovered from degraded: ${documentId}`, undefined);
      }
    } catch (e) {
      // I2：回队首，排在"失败期间新到达的增量"之前
      pending.set(documentId, [merged, ...(pending.get(documentId) ?? [])]);

      if (retry < maxRetry) {
        if (mode === 'shutdown') {
          // 进程要退了，不能等定时器：同步退避重试
          await sleep(retryBaseMs * (retry + 1));
          return doFlush(documentId, retry + 1, mode);
        }
        const delay = retryBaseMs * 2 ** retry;
        const timer = setTimeout(() => {
          timers.delete(documentId);
          void flushOne(documentId, retry + 1, mode).catch((err) =>
            onError(`[persist] retry failed: ${documentId}`, err)
          );
        }, delay);
        timers.set(documentId, timer);
        return;
      }

      // I6：一轮重试链走到头 → 累计耗尽轮次；达到阀值则熔断（不再自动续排）
      const rounds = (exhaustedRounds.get(documentId) ?? 0) + 1;
      exhaustedRounds.set(documentId, rounds);
      if (rounds >= maxExhaustedRounds) {
        if (!degraded.has(documentId)) {
          degraded.add(documentId);
          // 日志降噪：只在进入 degraded 时打一条（含最后一次错误）
          onError(
            `[persist] degraded: circuit open after ${rounds} exhausted rounds (${maxRetry + 1} attempts each); data kept in memory, will retry on next enqueue: ${documentId}`,
            e
          );
        }
        return; // 静默返回：finally 不会再续排
      }
      return; // 中间轮次静默：finally 按指数退避续排（每轮都打日志会刷爆日志）
    } finally {
      // I6：续排延迟随耗尽轮次指数增长，封顶 backoffCapMs（默认 30s），不允许无界重试
      if (mode === 'timer' && !degraded.has(documentId) && pending.get(documentId)?.length) {
        const rounds = exhaustedRounds.get(documentId) ?? 0;
        const backoff = Math.min(flushMs * 2 ** Math.min(rounds, 7), backoffCapMs);
        schedule(documentId, backoff);
      }
    }
  }

  async function flushAll(): Promise<FlushResult> {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();

    // 关键边界（T3-1）：在飞任务已把批次从 pending 摘下，flushAll 直接扫 pending 会看不到它们，
    // 进程退出时这部分数据会丢。先等在飞任务收敛（失败会回队），再清一次定时器后统一落库。
    if (inFlight.size) {
      await Promise.allSettled([...inFlight.values()]);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    }

    const ids = [...pending.keys()];
    /** 去重后的累计处理文档（首轮 + 第二次尽力） */
    const seen = new Set<string>(ids);
    let retried = 0;

    if (ids.length) {
      // I4：allSettled，单个文档失败不影响其他文档
      //
      // 边界说明（T3-1）：若某文档此时已有在飞的 timer 模式任务，
      // flushOne() 会直接复用它（返回同一个 Promise），因此这一轮拿到的
      // 结果可能仍是 timer 模式（而非 shutdown 的同步退避重试）。
      // 兑现方式：下面的“第二次尽力”会用 shutdown 模式再试一次；
      // 仍失败则留在 pending，由调用方记录（数据不丢）。
      const results = await Promise.allSettled(
        ids.map((id) => flushOne(id, 0, 'shutdown'))
      );
      const rejected = results.filter((r) => r.status === 'rejected').length;
      if (rejected) {
        onError(`[persist] shutdown flush: ${rejected}/${ids.length} 个文档落库报错`, undefined);
      }

      // 残留（重试耗尽 / 在飞任务未拿到新数据 / 期间又有新增量）：再尽力一次
      if (pending.size) {
        const rest = [...pending.keys()];
        retried = rest.length;
        rest.forEach((id) => seen.add(id));
        await Promise.allSettled(rest.map((id) => flushOne(id, maxRetry, 'shutdown')));
      }
    }

    // 口径：total=去重后累计处理文档；retried=第二次尽力文档数；failed=结束时仍未落库文档数
    const stillPending = [...pending.keys()];
    return { total: seen.size, retried, failed: stillPending.length, pending: stillPending };
  }

  return {
    enqueue(documentId, update) {
      // I7：内存上限——超限拒收（而不是丢掉已排队数据，否则 OOM 会一起丢）
      if (totalBytes + update.byteLength > maxTotalBytes) {
        if (!overCapWarned) {
          overCapWarned = true;
          onError(
            `[persist] memory cap exceeded (${totalBytes}/${maxTotalBytes} bytes): new updates are rejected until flush catches up`,
            undefined
          );
        }
        return;
      }

      // I6：客户端仍在编辑 → 清熔断与轮次，重新开始尝试
      if (degraded.has(documentId)) {
        degraded.delete(documentId);
        exhaustedRounds.delete(documentId);
        onError(`[persist] resumed from degraded: ${documentId}`, undefined);
      }

      const list = pending.get(documentId) ?? [];
      list.push(update);
      pending.set(documentId, list);
      totalBytes += update.byteLength;
      schedule(documentId);
    },
    flushAll,
    pendingDocs: () => [...pending.keys()],
    totalBytes: () => totalBytes,
    degradedDocs: () => [...degraded],
    dispose() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      pending.clear();
      totalBytes = 0;
      overCapWarned = false;
      exhaustedRounds.clear();
      degraded.clear();
    },
  };
}
