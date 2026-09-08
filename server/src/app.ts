/**
 * Express 应用装配（REST 部分；Hocuspocus 在 index.ts 同源挂载）
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes';
import { errorHandler } from './lib/http';
import { env, loadEnv } from './lib/env';

loadEnv();

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));

  // CORS：允许配置的前端源（Step3 也可用 Vite proxy 规避）
  app.use(
    cors({
      origin(origin, callback) {
        const allowed = env.CORS_ORIGINS;
        if (!origin || allowed.length === 0 || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // 认证接口限流（防爆破）
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 42900, data: null, message: '请求过于频繁，请稍后再试' },
  });
  app.use('/api/v1/auth', authLimiter);

  // 健康检查
  app.get('/api/v1/health', (_req, res) => {
    res.json({ code: 0, data: { status: 'ok', ts: Date.now() }, message: 'ok' });
  });

  // 业务路由
  app.use('/api/v1/auth', authRoutes);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ code: 40400, data: null, message: '接口不存在' });
  });

  // 统一错误处理
  app.use(errorHandler);

  return app;
}
