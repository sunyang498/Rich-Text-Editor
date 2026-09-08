/**
 * 认证路由：/api/v1/auth
 */
import { Router } from 'express';
import { ok, wrap, Err } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { registerSchema, loginSchema, refreshSchema } from '../../lib/validation';
import * as service from './auth.service';

const router = Router();

// 注册
router.post(
  '/register',
  wrap(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw Err.BadRequest(parsed.error.issues[0]?.message ?? '参数错误');
    const data = await service.register(parsed.data);
    ok(res, data, '注册成功');
  })
);

// 登录
router.post(
  '/login',
  wrap(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw Err.BadRequest(parsed.error.issues[0]?.message ?? '参数错误');
    const data = await service.login(parsed.data);
    ok(res, data, '登录成功');
  })
);

// 刷新令牌
router.post(
  '/refresh',
  wrap(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw Err.BadRequest('缺少 refreshToken');
    const data = await service.refresh(parsed.data.refreshToken);
    ok(res, data, '刷新成功');
  })
);

// 登出（撤销 refresh）
router.post(
  '/logout',
  wrap(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw Err.BadRequest('缺少 refreshToken');
    await service.logout(parsed.data.refreshToken);
    ok(res, null, '已退出登录');
  })
);

// 当前用户
router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await service.me(req.user!.id);
    ok(res, user);
  })
);

export default router;
