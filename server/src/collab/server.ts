/**
 * 协同服务器（Hocuspocus，挂载于 /collaboration，与 REST 同源同端口）
 *
 * 权限模型（M1：owner 私有；M2 再加 is_public viewer）：
 *  - onAuthenticate：① 校验 ticket（HMAC 签名/过期/绑定 docId，防伪造/防跨文档）
 *                    ② DB 重查：文档存在且未软删 + 连接者==owner（防撤销/越权，不只信 ticket role）
 *  - connectionConfig.readOnly：M2 对 viewer 置 true（服务端强制拦截上行 update）
 *
 * 持久化（append-only，spike-2 验证）：
 *  - onLoadDocument：从 y_doc_updates 全量重放
 *  - onChange：增量 append 落库（每次事务）
 */
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import { prisma } from '../lib/prisma';
import { verifyCollabTicket } from '../lib/token';
import { getUpdates, appendUpdate } from '../lib/y-store';

export function createCollabServer(): Hocuspocus {
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

    // 每次事务变更：增量 append 落库
    async onChange({ documentName, update }) {
      await appendUpdate(documentName, update);
    },
  });
}
