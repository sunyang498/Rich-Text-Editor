/**
 * 文档业务（owner 私有模型；M2 再加 is_public viewer）
 * - 他人访问一律 404（防枚举）；owner 判定在 DB 层完成
 * - 建文档 = 事务：documents 行 + 初始 Yjs 基线 update（审批 ③：事务可讲点）
 */
import { prisma } from '../../lib/prisma';
import { Err } from '../../lib/http';
import { signCollabTicket } from '../../lib/token';
import { emptyYDocUpdate } from '../../lib/y-store';
import type { CreateDocInput } from '../../lib/validation';

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

/** 打开文档：owner 校验 + 签发 collab ticket（HMAC 60s 绑定 docId） */
export async function openDoc(userId: string, docId: string) {
  const doc = await prisma.document.findFirst({ where: { id: docId, deletedAt: null } });
  // 私有文档：非 owner 一律 404，防枚举
  if (!doc || doc.ownerId !== userId) throw Err.NotFound('文档不存在或无权访问');
  const collabTicket = signCollabTicket({ uid: userId, role: 'owner', doc: docId });
  return { doc: dto(doc), collabTicket };
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

/** 软删除（owner） */
export async function removeDoc(userId: string, docId: string): Promise<void> {
  const r = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (r.count === 0) throw Err.NotFound('文档不存在或无权访问');
}
