<script setup>
import { ref, onMounted, onUnmounted, nextTick,inject } from 'vue'
import * as Y from 'yjs'

// 响应式数据
const status = ref('未连接')
const isConnected = ref(false)
const editorElement = ref(null)

// Yjs 相关变量
let doc = null
let text = null
let ws = null

// 计算状态样式
const statusClass = ref('status-disconnected')

// 初始化 Yjs 文档 
const initYjs = () => {
  doc = inject('ydoc')
  text = doc.getText('content')
  
  // 监听文本变化并更新编辑器
  text.observe(() => {
    if (editorElement.value) {
      const currentText = editorElement.value.innerText
      const newText = text.toString()
      
      // 避免重复更新导致的光标跳动
      if (currentText !== newText) {
        // 保存当前光标位置
        const selection = window.getSelection()
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
        
        // 更新内容
        editorElement.value.innerText = newText
        
        // 恢复光标位置
        if (range) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  })
  
  // 监听文档更新并发送到服务器
  doc.on('update', (update) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // 直接发送 ArrayBuffer，不转换为 JSON 字符串
      ws.send(update)
    }
  })
}

// 处理接收到的 WebSocket 消息
const handleWebSocketMessage = async (event) => {
  try {
    let data = event.data
    
    // 如果数据是 Blob，转换为 ArrayBuffer
    if (data instanceof Blob) {
      data = await new Response(data).arrayBuffer()
    }
    
    // 应用从其他客户端收到的更新
    const update = new Uint8Array(data)
    Y.applyUpdate(doc, update)
  } catch (error) {
    console.error('处理 WebSocket 消息时出错:', error)
  }
}

// 连接 WebSocket
const connect = () => {
  if (isConnected.value) return
  
  ws = new WebSocket('ws://localhost:8081')
  
  // 设置二进制数据类型为 arraybuffer
  ws.binaryType = 'arraybuffer'
  
  ws.onopen = () => {
    status.value = '已连接'
    isConnected.value = true
    statusClass.value = 'status-connected'
    console.log('连接到服务器')
  }
  
  ws.onmessage = handleWebSocketMessage
  
  ws.onclose = () => {
    status.value = '未连接'
    isConnected.value = false
    statusClass.value = 'status-disconnected'
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error)
    status.value = '连接错误'
    statusClass.value = 'status-error'
  }
}

// 断开连接
const disconnect = () => {
  if (ws) {
    ws.close()
    ws = null
  }
  status.value = '未连接'
  isConnected.value = false
  statusClass.value = 'status-disconnected'
}

// 处理编辑器输入
const handleEditorInput = (event) => {
  const newText = event.target.innerText
  const currentText = text.toString()
  
  if (newText !== currentText) {
    // 删除旧内容，插入新内容
    text.delete(0, text.length)
    text.insert(0, newText)
  }
}

// 组件挂载时初始化 Yjs
onMounted(() => {
  initYjs()
})

// 组件卸载时清理资源
onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="editor-container">
    <h1>实时协作编辑</h1>
    
    <div class="status">
      状态: <span :class="statusClass">{{ status }}</span>
    </div>
    
    <div class="controls">
      <button 
        @click="connect" 
        :disabled="isConnected"
        class="btn btn-connect"
      >
        连接
      </button>
      <button 
        @click="disconnect" 
        :disabled="!isConnected"
        class="btn btn-disconnect"
      >
        断开
      </button>
    </div>
    
    <div 
      ref="editorElement"
      contenteditable="true" 
      class="editor"
      @input="handleEditorInput"
    ></div>
  </div>
</template>

<style scoped>
.editor-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

.status {
  margin-bottom: 15px;
  font-size: 16px;
}

.status-connected {
  color: #28a745;
  font-weight: bold;
}

.status-disconnected {
  color: #6c757d;
  font-weight: bold;
}

.status-error {
  color: #dc3545;
  font-weight: bold;
}

.controls {
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-connect {
  background-color: #28a745;
  color: white;
}

.btn-connect:hover:not(:disabled) {
  background-color: #218838;
}

.btn-disconnect {
  background-color: #dc3545;
  color: white;
}

.btn-disconnect:hover:not(:disabled) {
  background-color: #c82333;
}

.editor {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 15px;
  min-height: 200px;
  font-size: 16px;
  line-height: 1.5;
  outline: none;
}

.editor:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
</style>