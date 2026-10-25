/**
 * 认证守卫：校验 Bearer AccessToken，注入 req.user
 */
import type { RequestHandler } from 'express';
import { Err } from '../lib/http';
import { verifyAccessToken } from '../lib/token';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    next(Err.Unauthorized());
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(Err.Unauthorized());
  }
};

/**
 * 可选认证（M2：公开文档匿名只读）
 * - 无 Authorization：匿名放行，req.user 为空
 * - 有 Authorization 但无效/过期：401（不能静默降级为匿名，否则前端失去刷新机会）
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(Err.Unauthorized());
  }
};
