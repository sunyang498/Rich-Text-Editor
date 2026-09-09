/**
 * Yjs 存储层（append-only + 全量重放，spike-2 已验证）
 * - appendUpdate：onChange 增量落库（MediumBlob）
 * - getUpdates：按 id 升序全量读取（打开/重放用）
 * - emptyYDocUpdate：空 Y.Doc 基线（建文档事务内写入，保证"有记录即有基线"）
 */
import { prisma } from './prisma';
import * as Y from 'yjs';

/** 空 Y.Doc 的基线 update（建文档事务内写入一条） */
export function emptyYDocUpdate(): Uint8Array {
  return Y.encodeStateAsUpdate(new Y.Doc());
}

/** 追加一条增量（append-only） */
export async function appendUpdate(documentId: string, update: Uint8Array): Promise<void> {
  await prisma.yDocUpdate.create({
    data: { documentId, update: Buffer.from(update) },
  });
}

/** 读取全部增量（按 id 升序），重放用 */
export async function getUpdates(documentId: string): Promise<Uint8Array[]> {
  const rows = await prisma.yDocUpdate.findMany({
    where: { documentId },
    orderBy: { id: 'asc' },
    select: { update: true },
  });
  return rows.map((r) => new Uint8Array(r.update));
}
