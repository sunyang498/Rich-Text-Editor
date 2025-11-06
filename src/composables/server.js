import { WebSocketServer } from "ws";

// 创建WebSocket服务器，监听8081端口
const wss = new WebSocketServer({ port: 8081 });

console.log('WebSocket服务器已启动，监听端口：8081');

// 监听客户端连接
wss.on('connection', (ws) => {
    console.log('新客户端已连接');

    // 接收客户端消息
    ws.on('message', (message) => {
        console.log(`收到客户端消息：${message}`);
        // 向客户端回复消息
        wss.clients.forEach((client)=>{
            if(client!==ws)
                client.send(`服务器已收到：${message}`);
        })
        
    });

    // 监听连接关闭
    ws.on('close', () => {
        console.log('客户端已断开连接');
    });

    // 发送欢迎消息
    ws.send('欢迎连接到WebSocket服务器！');
});