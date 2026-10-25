/**
 * 文档业务（owner 私有 + is_public 公开只读）
 * - 他人访问私有文档一律 404（防枚举）；owner 判定在 DB 层完成
 * - is_public=true 时：未登录/他人可读，collab ticket 为 viewer（服务端强制只读）
 * - 建文档 = 事务：documents 行 + 初始 Yjs 基线 update（审批 ③：事务可讲点）
 */
import { prisma } from '../../lib/prisma';
import { Err } from '../../lib/http';
import { signCollabTicket } from '../../lib/token';
import { emptyYDocUpdate } from '../../lib/y-store';
import { closeDocConnections, closeViewerConnections } from '../../lib/collab-registry';
import type { CreateDocInput } from '../../lib/validation';

/** 当前连接者在本文档上的角色（M2 仅两态：owner 全权 / viewer 只读） */
export type DocRole = 'owner' | 'viewer';

const LIST_LIMIT_DEFAULT = 20;

type DocRow = {
  id: string;
  title: string;
  isPublic: boolean;
  lastEditedAt: Date;
  createdAt: Date;
};

function dto(d: DocRow) {
  return { id: d.id, title: d.title, isPublic: d.isPublic, lastEditedAt: d.lastEditedAt, createdAt: d.createdAt };
}

/** 我的文档列表（cursor 分页：last_edited_at 倒序） */
export async function listDocs(userId: string, opts: { cursor?: string; limit?: number }) {
  const limit = opts.limit ?? LIST_LIMIT_DEFAULT;
  const where = {
    ownerId: userId,
    deletedAt: null,
    ...(opts.cursor ? { lastEditedAt: { lt: new Date(opts.cursor) } } : {}),
  };
  const rows = await prisma.document.findMany({
    where,
    orderBy: { lastEditedAt: 'desc' },
    take: limit + 1,
    select: { id: true, title: true, isPublic: true, lastEditedAt: true, createdAt: true },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].lastEditedAt.toISOString() : null;
  return { items: items.map(dto), nextCursor };
}

/** 新建文档（事务：文档 + 初始 Yjs 基线） */
export async function createDoc(userId: string, input: CreateDocInput) {
  const title = input.title?.trim() || '无标题文档';
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({ data: { ownerId: userId, title } });
    await tx.yDocUpdate.create({
      data: { documentId: d.id, update: Buffer.from(emptyYDocUpdate()) },
    });
    return d;
  });
  return dto(doc);
}

/**
 * 打开文档：判定角色 + 签发 collab ticket（HMAC 60s，绑定 role + docId）
 * - owner：可读写
 * - is_public：任何人（含匿名）→ viewer 只读；匿名 uid 记为 'anon'
 * - 私有且非 owner：未登录 401（引导登录）/ 已登录 404（防枚举）
 */
export async function openDoc(userId: string | null, docId: string) {
  const doc = await prisma.document.findFirst({ where: { id: docId, deletedAt: null } });
  if (!doc) throw Err.NotFound('文档不存在或无权访问');

  if (userId && doc.ownerId === userId) {
    const collabTicket = signCollabTicket({ uid: userId, role: 'owner', doc: docId });
    return { doc: dto(doc), role: 'owner' as DocRole, collabTicket };
  }

  if (doc.isPublic) {
    const collabTicket = signCollabTicket({ uid: userId ?? 'anon', role: 'viewer', doc: docId });
    return { doc: dto(doc), role: 'viewer' as DocRole, collabTicket };
  }

  if (!userId) throw Err.Unauthorized('该文档未公开，请先登录');
  throw Err.NotFound('文档不存在或无权访问');
}

/** 公开只读开关（owner）— 关闭时立即断开已有的只读连接 */
export async function setPublic(userId: string, docId: string, isPublic: boolean) {
  const r = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, deletedAt: null },
    data: { isPublic },
  });
  if (r.count === 0) throw Err.NotFound('文档不存在或无权访问');
  // 关闭公开：已建立的 viewer 连接不会再走 onAuthenticate，必须主动踢掉（否则内容继续下发）
  if (!isPublic) closeViewerConnections(docId);
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: docId } });
  return dto(doc);
}

/** 重命名（owner） */
export async function renameDoc(userId: string, docId: string, title: string) {
  const r = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, deletedAt: null },
    data: { title },
  });
  if (r.count === 0) throw Err.NotFound('文档不存在或无权访问');
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: docId } });
  return dto(doc);
}

/** 软删除（owner）；成功后主动断开该文档的在线协同连接（E2） */
export async function removeDoc(userId: string, docId: string): Promise<void> {
  const r = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (r.count === 0) throw Err.NotFound('文档不存在或无权访问');
  closeDocConnections(docId);
}
