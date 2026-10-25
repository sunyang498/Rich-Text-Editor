/**
 * 协同连接注册表（解耦：docs 业务不直接依赖 Hocuspocus 类型）
 * 用途：
 *  - 文档软删后，由服务端主动断开该文档的所有在线连接（审批 E2）
 *  - 关闭公开（is_public=false）后，主动断开该文档的只读连接（M2）
 */
type Closer = (documentId: string) => void;

let closer: Closer | null = null;
let viewerCloser: Closer | null = null;

/** index.ts 启动时注册（collab.closeConnections） */
export function registerCollabCloser(fn: Closer): void {
  closer = fn;
}

/** index.ts 启动时注册（仅断开只读连接；无只读连接时不动 owner） */
export function registerViewerCloser(fn: Closer): void {
  viewerCloser = fn;
}

/** 主动断开某文档的所有协同连接（尽力而为，失败不影响主流程） */
export function closeDocConnections(documentId: string): void {
  try {
    closer?.(documentId);
  } catch (e) {
    console.error('[collab-registry] close connections failed:', e);
  }
}

/** 主动断开某文档的只读（viewer/匿名）连接（关公开用） */
export function closeViewerConnections(documentId: string): void {
  try {
    viewerCloser?.(documentId);
  } catch (e) {
    console.error('[collab-registry] close viewer connections failed:', e);
  }
}
