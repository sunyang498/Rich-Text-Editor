/**
 * 文档路由：/api/v1/docs
 * - 除 GET /:id 外均需登录（owner 私有）
 * - GET /:id 用 optionalAuth：公开文档允许匿名只读打开（M2）
 */
import { Router } from 'express';
import { ok, wrap, Err } from '../../lib/http';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import {
  createDocSchema,
  renameDocSchema,
  listDocsSchema,
  setPublicSchema,
} from '../../lib/validation';
import * as service from './docs.service';

const router = Router();

// 我的文档列表
router.get(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const q = listDocsSchema.safeParse(req.query);
    if (!q.success) throw Err.BadRequest('分页参数错误');
    const data = await service.listDocs(req.user!.id, { cursor: q.data.cursor, limit: q.data.limit });
    ok(res, data);
  })
);

// 新建
router.post(
  '/',
  requireAuth,
  wrap(async (req, res) => {
    const b = createDocSchema.safeParse(req.body);
    if (!b.success) throw Err.BadRequest(b.error.issues[0]?.message ?? '参数错误');
    const data = await service.createDoc(req.user!.id, b.data);
    ok(res, data, '创建成功');
  })
);

// 打开（返回元数据 + 角色 + collab ticket）；公开文档可匿名调用（role=viewer）
router.get(
  '/:id',
  optionalAuth,
  wrap(async (req, res) => {
    const data = await service.openDoc(req.user?.id ?? null, (req.params as { id: string }).id);
    ok(res, data);
  })
);

// 公开只读开关（owner）
router.patch(
  '/:id/public',
  requireAuth,
  wrap(async (req, res) => {
    const b = setPublicSchema.safeParse(req.body);
    if (!b.success) throw Err.BadRequest('isPublic 必须为布尔值');
    const data = await service.setPublic(
      req.user!.id,
      (req.params as { id: string }).id,
      b.data.isPublic
    );
    ok(res, data, b.data.isPublic ? '已开启公开只读' : '已关闭公开只读');
  })
);

// 重命名
router.patch(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    const b = renameDocSchema.safeParse(req.body);
    if (!b.success) throw Err.BadRequest(b.error.issues[0]?.message ?? '参数错误');
    const data = await service.renameDoc(req.user!.id, (req.params as { id: string }).id, b.data.title);
    ok(res, data, '已重命名');
  })
);

// 软删除
router.delete(
  '/:id',
  requireAuth,
  wrap(async (req, res) => {
    await service.removeDoc(req.user!.id, (req.params as { id: string }).id);
    ok(res, null, '已删除');
  })
);

export default router;
