/**
 * 统一 HTTP 响应与错误
 * - 成功：{ code: 0, data, message: 'ok' }
 * - 失败：{ code: <业务码>, message } + HTTP 状态码
 */
import type { NextFunction, Request, Response } from 'express';

/** 业务错误：携带 HTTP 状态 + 业务码 */
export class HttpError extends Error {
  status: number;
  code: number;
  constructor(status: number, code: number, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** 业务错误码约定 */
export const Err = {
  BadRequest: (m = '参数错误') => new HttpError(400, 40000, m),
  Unauthorized: (m = '未登录或登录已过期') => new HttpError(401, 40101, m),
  InvalidRefresh: (m = '刷新令牌无效') => new HttpError(401, 40102, m),
  Forbidden: (m = '无权限') => new HttpError(403, 40301, m),
  NotFound: (m = '资源不存在') => new HttpError(404, 40401, m),
  Conflict: (m = '资源冲突') => new HttpError(409, 40901, m),
} as const;

/** JSON replacer：BigInt → String（Prisma 自增 id 为 BigInt；S4 预防 res.json 抛错） */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

/** 成功响应 */
export function ok(res: Response, data: unknown, message = 'ok'): void {
  const payload = { code: 0, data, message };
  res.status(200).type('application/json').send(JSON.stringify(payload, jsonReplacer));
}

/** 包装异步 handler，自动把 reject 交给 error 中间件 */
export function wrap(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Prisma 已知错误码映射（避免唯一约束等落到 500） */
function mapPrismaError(err: unknown): HttpError | null {
  if (typeof err !== 'object' || err === null) return null;
  const code = (err as { code?: string }).code;
  if (code === 'P2002') return Err.Conflict('资源已存在（唯一约束冲突）'); // 并发注册同邮箱（B2）
  if (code === 'P2025') return Err.NotFound('目标记录不存在');
  return null;
}

/** 全局错误处理中间件 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, data: null, message: err.message });
    return;
  }
  const mapped = mapPrismaError(err);
  if (mapped) {
    res.status(mapped.status).json({ code: mapped.code, data: null, message: mapped.message });
    return;
  }
  // 未知错误：不向客户端泄露内部细节
  console.error('[server] unhandled error:', err);
  res.status(500).json({ code: 50000, data: null, message: '服务器内部错误' });
}
