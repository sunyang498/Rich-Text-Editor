/**
 * 协同服务器（Hocuspocus，挂载于 /collaboration，与 REST 同源同端口）
 *
 * 权限模型（M1：owner 私有；M2 再加 is_public viewer）：
 *  - onAuthenticate：① 校验 ticket（HMAC 签名/过期/绑定 docId，防伪造/防跨文档）
 *                    ② DB 重查：文档存在且未软删 + 连接者==owner（防撤销/越权，不只信 ticket role）
 *  - connectionConfig.readOnly：M2 对 viewer 置 true（服务端强制拦截上行 update）
 *
 * 持久化（append-only）：
 *  - onLoadDocument：从 y_doc_updates 全量重放
 *  - onChange：增量先入内存队列，300ms 防抖 + Y.mergeUpdates 合并后 append（退出时 flush）
 */
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import { prisma } from '../lib/prisma';
import { verifyCollabTicket } from '../lib/token';
import { getUpdates, appendUpdate } from '../lib/y-store';

/** 落库防抖：事务增量先入内存队列，固定窗口(300ms)合并为一条写入，避免每击键写库 */
const FLUSH_DEBOUNCE_MS = 300;
const pendingUpdates = new Map<string, Uint8Array[]>();
const flushTimers = new Map<string, NodeJS.Timeout>();

function scheduleFlush(documentId: string): void {
  if (flushTimers.has(documentId)) return; // 固定窗口（maxDebounce 语义）
  const timer = setTimeout(() => {
    flushTimers.delete(documentId);
    void flushDocumentUpdates(documentId);
  }, FLUSH_DEBOUNCE_MS);
  flushTimers.set(documentId, timer);
}

async function flushDocumentUpdates(documentId: string): Promise<void> {
  const updates = pendingUpdates.get(documentId);
  if (!updates?.length) return;
  pendingUpdates.delete(documentId);
  const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates); // 无损合并
  await appendUpdate(documentId, merged);
}

/** 进程退出前调用：清空定时器并落库剩余增量 */
export async function flushPendingUpdates(): Promise<void> {
  for (const timer of flushTimers.values()) clearTimeout(timer);
  flushTimers.clear();
  await Promise.all([...pendingUpdates.keys()].map((id) => flushDocumentUpdates(id)));
}

export function createCollabServer(): Hocuspocus {
  // last_edited_at 节流（避免每事务都写 documents 表）
  const lastTouch = new Map<string, number>();
  const TOUCH_THROTTLE_MS = 2000;

  return new Hocuspocus({
    async onAuthenticate({ documentName, token, connectionConfig }) {
      const claim = verifyCollabTicket(String(token ?? ''));
      if (!claim) throw new Error('invalid or expired ticket');
      if (claim.doc !== documentName) throw new Error('ticket not for this document');

      // DB 重查（防撤销/防越权）：文档存在、未软删、且连接者是 owner
      const doc = await prisma.document.findFirst({ where: { id: documentName, deletedAt: null } });
      if (!doc) throw new Error('document not found or deleted');
      if (doc.ownerId !== claim.uid) throw new Error('not the document owner');
      // M1：owner 可读写；M2 将在此处理 is_public viewer → connectionConfig.readOnly = true

      return { uid: claim.uid, role: 'editor' };
    },

    // 打开文档：全量重放恢复
    async onLoadDocument({ documentName }) {
      const ydoc = new Y.Doc();
      const updates = await getUpdates(documentName);
      for (const u of updates) Y.applyUpdate(ydoc, u);
      return ydoc;
    },

    // 每次事务变更：增量入队（防抖合并落库）；节流更新文档最后编辑时间
    async onChange({ documentName, update }) {
      const list = pendingUpdates.get(documentName) ?? [];
      list.push(update);
      pendingUpdates.set(documentName, list);
      scheduleFlush(documentName);

      const now = Date.now();
      if (now - (lastTouch.get(documentName) ?? 0) >= TOUCH_THROTTLE_MS) {
        lastTouch.set(documentName, now);
        await prisma.document
          .update({ where: { id: documentName }, data: { lastEditedAt: new Date() } })
          .catch(() => {
            /* 文档可能已被软删，忽略 */
          });
      }
    },
  });
}
