import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 8081 });

console.log('Yjs 服务器运行在 ws://localhost:8081');

wss.on('connection', function connection(ws) {
    console.log('新客户端连接');
    ws.on('message', function message(data) {
        // 简单地将收到的消息广播给所有其他客户端
        console.log('收到',data)
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
});