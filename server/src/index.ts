/**
 * 笔砚云版后端入口
 * - REST（Express /api/v1）与协同（Hocuspocus /collaboration）同源同端口
 * - 协同桥接：官方 v4 recipe —— crossws/adapters/node 挂 http upgrade，hooks 转发给 Hocuspocus.handleConnection
 */
import http from 'http';
import crossws from 'crossws/adapters/node';
import { Hocuspocus, type WebSocketLike } from '@hocuspocus/server';
import { createApp } from './app';
import { createCollabServer } from './collab/server';
import { env, loadEnv } from './lib/env';

loadEnv();

const port = env.PORT;
const app = createApp();
const httpServer = http.createServer(app);

// 协同服务器（鉴权/持久化见 collab/server.ts）
const collab: Hocuspocus = createCollabServer();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ws = crossws({
  hooks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open(peer: any) {
      const clientConnection = collab.handleConnection(
        peer.websocket as unknown as WebSocketLike,
        peer.request as Request
      );
      peer._hocuspocus = clientConnection;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message(peer: any, message: any) {
      peer._hocuspocus?.handleMessage(message.uint8Array());
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    close(peer: any, event: any) {
      peer._hocuspocus?.handleClose({ code: event.code, reason: event.reason });
    },
    error(_peer: unknown, error: unknown) {
      console.error('[collab] websocket error:', error);
    },
  },
});

// 仅接受 /collaboration 路径的 WebSocket 升级，其余交给 Express 走 REST
httpServer.on('upgrade', (request, socket, head) => {
  const url = request.url ?? '';
  if (!url.startsWith('/collaboration')) {
    socket.destroy();
    return;
  }
  ws.handleUpgrade(request, socket, head);
});

httpServer.listen(port, () => {
  console.log(`[biyan-server] listening http://localhost:${port} (REST /api/v1 + WSS /collaboration)`);
});

// 优雅退出：onChange 为每事务即时落库，无 debounce 挂起，可安全退出
function shutdown(): void {
  console.log('[biyan-server] shutting down');
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
