/**
 * REST 最小冒烟（node:test + 原生 fetch，不引入 supertest）
 *
 * 覆盖：
 *  1. GET /health → 200
 *  2. 无 token GET /docs → 401
 *  3. POST /auth/login（seed 账号）→ 拿到 tokens
 *  4. 带 token POST /docs → 200 且返回 id
 *
 * 前置：本地 MySQL 已 `prisma migrate deploy` + `npm run seed`
 * 无 DB 环境下自动 skip（不 fail）。
 * 运行：npm --prefix server run test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { loadEnv } from '../lib/env';

loadEnv();

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@biyan.local';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'demo12345';

interface TestServer {
  base: string;
  close: () => Promise<void>;
}

/** 在随机端口起一个真实 Express 实例（不走 3000，避免与开发服务器冲突） */
async function startTestServer(): Promise<TestServer> {
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return {
    base: `http://127.0.0.1:${port}/api/v1`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/** 数据库可用性探测：无 DATABASE_URL 或连不上都返回 false */
async function dbAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

test('REST 冒烟：health / 未登录 401 / login / 新建文档', async (t) => {
  if (!(await dbAvailable())) {
    t.skip('未检测到可用数据库（DATABASE_URL 缺失或连接失败），跳过冒烟测试');
    return;
  }

  const srv = await startTestServer();
  let createdDocId: string | null = null;

  try {
    // 1) 健康检查
    const health = await fetch(`${srv.base}/health`);
    assert.equal(health.status, 200, 'GET /health 应为 200');
    const healthBody = (await health.json()) as { code?: number };
    assert.equal(healthBody.code, 0, '健康检查应返回 code:0');

    // 2) 未登录访问受保护接口
    const unauth = await fetch(`${srv.base}/docs`);
    assert.equal(unauth.status, 401, '无 token 访问 GET /docs 应为 401');

    // 3) 登录（seed 账号）
    const login = await fetch(`${srv.base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    assert.equal(login.status, 200, `登录应返回 200（请确认已执行 npm run seed）`);
    const loginBody = (await login.json()) as {
      data?: { tokens?: { accessToken?: string } };
    };
    const accessToken = loginBody.data?.tokens?.accessToken;
    assert.ok(accessToken, '登录响应应包含 accessToken');

    const auth = {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };

    // 4) 新建文档
    const created = await fetch(`${srv.base}/docs`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: 'smoke-test' }),
    });
    assert.equal(created.status, 200, 'POST /docs 应为 200');
    const createdBody = (await created.json()) as { data?: { id?: string; title?: string } };
    assert.ok(createdBody.data?.id, '新建文档应返回 id');
    createdDocId = createdBody.data!.id!;

    // 5) 清理：软删刚建的文档（保持数据干净）
    const removed = await fetch(`${srv.base}/docs/${createdDocId}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.equal(removed.status, 200, '清理：软删应成功');
    createdDocId = null;
  } finally {
    if (createdDocId) {
      // 兜底清理（失败也不影响结论）
      await prisma.document
        .update({ where: { id: createdDocId }, data: { deletedAt: new Date() } })
        .catch(() => undefined);
    }
    await srv.close();
    await prisma.$disconnect();
  }
});
