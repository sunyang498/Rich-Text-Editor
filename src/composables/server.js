import { WebSocketServer } from "ws";
import { inject } from 'vue'
import * as Y from 'yjs'

// 创建服务器
const wss = new WebSocketServer({ port: 3001 })
console.log('服务器运行在端口 3001')

// 单个共享文档
const ydoc = inject('ydoc')
// ydoc.getText('prosemirror') // 预创建结构

// 存储所有客户端
const clients = new Set()

wss.on('connection', (ws) => {
    console.log('新客户端连接')
    clients.add(ws)
    
    // 发送当前文档状态给新客户端
    const update = Y.encodeStateAsUpdate(ydoc)
    ws.send(JSON.stringify({
        type: 'update',
        update: Array.from(update)
    }))
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data)
            if (message.type === 'update') {
                // 应用到服务器文档
                Y.applyUpdate(ydoc, new Uint8Array(message.update))
                
                // 广播给所有其他客户端
                clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                    type: 'update',
                    update: message.update
                    }))
                }
                })
            }
        } catch (error) {
            console.error('处理消息错误:', error)
        }
    })
    
    ws.on('close', () => {
        console.log('客户端断开')
        clients.delete(ws)
    })
})