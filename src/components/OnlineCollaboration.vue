<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue';
import { useEditorContext } from '@/composables/EditorContext';

// 状态变量
const isConnected = ref(false);
const message = ref('');
const messageList = ref([]);
let ws = null;
const editor=useEditorContext()

// 连接服务器
const connect = () => {
  // 连接本地8081端口的WebSocket服务器
  ws = new WebSocket('ws://localhost:8081');

  // 连接成功回调
  ws.onopen = () => {
    isConnected.value = true;
    messageList.value.push('连接成功！');
  };

  // 接收消息回调
  ws.onmessage = (event) => {
    messageList.value.push(`收到：${event.data}`);
  };

  // 连接错误回调
  ws.onerror = (error) => {
    messageList.value.push(`错误：${error}`);
  };

  // 连接关闭回调
  ws.onclose = () => {
    isConnected.value = false;
    messageList.value.push('连接已关闭');
    console.log('message',messageList)
  };
};

// 断开连接
const disconnect = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

// 发送消息
const sendMessage = () => {
    message.value=editor.value.getText()
    if (!message.value || !ws) return;
    ws.send(message.value);
    messageList.value.push(`发送：${message.value}`);
    message.value = ''; // 清空输入框
};

// 组件销毁前断开连接
onBeforeUnmount(() => {
  disconnect();
});

onMounted(()=>{
    setTimeout(()=>{
        sendMessage()
    },3500)
})
</script>

<template>
  <div class="ws-test">
    <h2>WebSocket测试</h2>
    <button @click="connect" :disabled="isConnected">连接服务器</button>
    <button @click="disconnect" :disabled="!isConnected">断开连接</button>
    
    <div v-if="isConnected" class="message-area">
      <input 
        placeholder="输入消息"
        @keyup.enter="sendMessage"
      >
      <button @click="sendMessage">发送</button>
      
      <div class="message-list">
        <p v-for="(msg, index) in messageList" :key="index">
          {{ msg }}
        </p>
      </div>
    </div>
    
    <p class="status">状态：{{ isConnected ? '已连接' : '未连接' }}</p>
  </div>
</template>

<style scoped>
.ws-test {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

button {
  margin: 0 5px;
  padding: 6px 12px;
  cursor: pointer;
}

.message-area {
  margin: 15px 0;
  padding: 10px;
  border: 1px dashed #666;
}

input {
  width: 300px;
  padding: 6px;
  margin-right: 10px;
}

.message-list {
  margin-top: 15px;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
}

.status {
  color: #666;
  margin-top: 10px;
}
</style>