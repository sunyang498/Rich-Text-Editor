/**
 * 请求上下文类型扩展（express Request.user）
 */
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export {};
