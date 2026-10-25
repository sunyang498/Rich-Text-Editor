/**
 * 协同连接注册表（解耦：docs 业务不直接依赖 Hocuspocus 类型）
 * 用途：文档软删/撤销权限后，由服务端主动断开该文档的所有在线连接（审批 E2）
 */
type Closer = (documentId: string) => void;

let closer: Closer | null = null;

/** index.ts 启动时注册（collab.closeConnections） */
export function registerCollabCloser(fn: Closer): void {
  closer = fn;
}

/** 主动断开某文档的所有协同连接（尽力而为，失败不影响主流程） */
export function closeDocConnections(documentId: string): void {
  try {
    closer?.(documentId);
  } catch (e) {
    console.error('[collab-registry] close connections failed:', e);
  }
}
