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
 * 持久化（append-only，at-least-once）：
 *  - onLoadDocument：从 y_doc_updates 全量重放（Yjs applyUpdate 幂等，重复应用结果一致）
 *  - onChange：增量先入内存队列，300ms 固定窗口 + Y.mergeUpdates 合并后 append
 *  - 落库失败：把合并后的增量**回队首**并指数退避重试（上限 3 次），
 *    保证 ① 数据不静默丢失 ② 重放顺序不变（否则 Yjs 虽能收敛但顺序乱）
 *  - 进程退出：allSettled 尽力落库，单个文档失败不影响其他文档
 */
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import { prisma } from '../lib/prisma';
import { verifyCollabTicket } from '../lib/token';
import { getUpdates, appendUpdate } from '../lib/y-store';
import { createPersistQueue } from '../lib/persist-queue';

/**
 * 落库队列：append-only + 300ms 固定窗口 + 失败回队重试
 * 实现抽到 lib/persist-queue.ts，目的：可注入 append 失败做单测（P0-1/2/3 回归）
 */
const persistQueue = createPersistQueue({
  append: appendUpdate,
  merge: (updates) => Y.mergeUpdates(updates),
  flushMs: 300,
});

/** 进程退出前调用：清空定时器并尽力落库剩余增量（单文档失败不影响其他文档） */
export async function flushPendingUpdates(): Promise<void> {
  const result = await persistQueue.flushAll();
  if (result.failed || result.pending.length) {
    console.error(
      `[collab] shutdown flush incomplete: failed=${result.failed} pending=[${result.pending.join(',')}]`
    );
  }
}

/**
 * 关闭公开（is_public=false）时调用：
 * - 无只读连接 → 不动（避免房间里没有 viewer 时也无谓断连）
 * - 有只读连接 → 整房断开（Hocuspocus 无按连接过滤的批量断开能力）；
 *   owner 会被一并断开，但会自动带新票重连（≈1s 抖动，见交付文档 L4）
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

    // 每次事务变更：增量入队（300ms 窗口合并落库，失败回队重试）；节流更新文档最后编辑时间
    async onChange({ documentName, update }) {
      persistQueue.enqueue(documentName, update);

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
