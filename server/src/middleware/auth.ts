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
