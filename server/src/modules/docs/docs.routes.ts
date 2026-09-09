/**
 * 文档路由：/api/v1/docs（全部 requireAuth；owner 私有模型）
 */
import { Router } from 'express';
import { ok, wrap, Err } from '../../lib/http';
import { requireAuth } from '../../middleware/auth';
import { createDocSchema, renameDocSchema, listDocsSchema } from '../../lib/validation';
import * as service from './docs.service';

const router = Router();
router.use(requireAuth);

// 我的文档列表
router.get(
  '/',
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
  wrap(async (req, res) => {
    const b = createDocSchema.safeParse(req.body);
    if (!b.success) throw Err.BadRequest(b.error.issues[0]?.message ?? '参数错误');
    const data = await service.createDoc(req.user!.id, b.data);
    ok(res, data, '创建成功');
  })
);

// 打开（返回元数据 + collab ticket）
router.get(
  '/:id',
  wrap(async (req, res) => {
    const data = await service.openDoc(req.user!.id, (req.params as { id: string }).id);
    ok(res, data);
  })
);

// 重命名
router.patch(
  '/:id',
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
  wrap(async (req, res) => {
    await service.removeDoc(req.user!.id, (req.params as { id: string }).id);
    ok(res, null, '已删除');
  })
);

export default router;
