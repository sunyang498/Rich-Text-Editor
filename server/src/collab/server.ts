/**
 * 协同服务器（Hocuspocus，挂载于 /collaboration，与 REST 同源同端口）
 *
 * 权限模型（M2：owner 全权 + is_public viewer 只读）：
 *  - onAuthenticate：① 校验 ticket（HMAC 签名/过期/绑定 docId，防伪造/防跨文档）
 *                    ② DB 重查：文档存在且未软删（不只信 ticket，防撤销）
 *                       · role=owner → 连接者必须是 owner
 *                       · role=viewer → 文档必须仍 is_public=true（关公开后旧票立即失效）
 *                    ③ viewer → connectionConfig.readOnly=true（服务端拦上行 update）
 *  - closeViewerConnections：关公开时主动断开只读连接（否则已建立的连接继续收内容）
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

/**
 * 关闭公开（is_public=false）时调用：
 * - 该文档存在只读连接 → 断开该文档全部连接（owner 会自动带新票重连，重连时票已变 owner，无感）
 * - 无只读连接 → 不动（避免误踢 owner）
 * Hocuspocus 未提供按连接过滤的批量断开，故借助 Connection.readOnly 先探测。
 */
export function closeReadOnlyConnections(instance: Hocuspocus, documentId: string): void {
  const doc = instance.documents.get(documentId);
  if (!doc) return;
  const hasReadOnly = doc.getConnections().some((c) => c.readOnly === true);
  if (!hasReadOnly) return;
  console.log(`[collab] is_public=off → closing connections of doc ${documentId}`);
  instance.closeConnections(documentId);
}

/** 鉴权失败：带上 reason，Hocuspocus 会把它放进 PermissionDenied 帧（客户端可见可排障） */
function deny(reason: string): Error {
  return Object.assign(new Error(reason), { reason });
}

export function createCollabServer(): Hocuspocus {
  // last_edited_at 节流（避免每事务都写 documents 表）
  const lastTouch = new Map<string, number>();
  const TOUCH_THROTTLE_MS = 2000;

  return new Hocuspocus({
    async onAuthenticate({ documentName, token, connectionConfig }) {
      // 失败统一走 fail()：带 reason（客户端可见）+ 服务端日志，便于排障
      const fail = (reason: string): Error => {
        console.warn(`[collab] auth denied (${reason}) doc=${documentName}`);
        return deny(reason);
      };

      const claim = verifyCollabTicket(String(token ?? ''));
      if (!claim) throw fail('invalid or expired ticket');
      if (claim.doc !== documentName) throw fail('ticket not for this document');

      // DB 重查（防撤销/防越权）：文档存在且未软删
      const doc = await prisma.document.findFirst({ where: { id: documentName, deletedAt: null } });
      if (!doc) throw fail('document not found or deleted');

      if (claim.role === 'owner') {
        if (doc.ownerId !== claim.uid) throw fail('not the document owner');
        return { uid: claim.uid, role: 'owner', readOnly: false };
      }

      // viewer（匿名/他人）：仅当文档仍为公开只读
      if (!doc.isPublic) throw fail('document is not public');
      // 服务端强制只读：拦截该连接的上行 update（不依赖前端隐藏按钮）
      connectionConfig.readOnly = true;
      return { uid: claim.uid || 'anon', role: 'viewer', readOnly: true };
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
