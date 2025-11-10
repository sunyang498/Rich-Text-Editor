<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import useCollaborativeDoc from '@/composables/CollaborativeDoc'

// 中文注释：
// 该组件用于快速在页面中测试协同编辑的连接与 awareness。默认假设 Editor.vue
// 已经提供了 ydoc（provide('ydoc', ydoc)）并使用了 Collaboration extension。

// 创建 composable：由于 Editor.vue 已经使用 Collaboration extension，传入 registerPlugins:false
const collab = useCollaborativeDoc({ url: 'ws://localhost:1234', room: 'demo-room', registerPlugins: false })

const connected = collab.connected

// 从 provider.awareness 中读取当前的在线用户状态（返回 Map-like 结构）
const users = ref<Record<string, any>>({})

function refreshUsers() {
  try {
    const states = collab.provider.awareness.getStates()
    const entries: Record<string, any> = {}
    // awareness.getStates() 返回 Map 的迭代器
    for (const [key, val] of states) {
      entries[String(key)] = val
    }
    users.value = entries
  } catch (e) {
    users.value = {}
  }
}

function toggleConnection() {
  if (connected.value) {
    // 断开：优先尝试 disconnect（若存在），否则作为回退使用 destroy
    try {
      // @ts-ignore
      collab.provider.disconnect()
    } catch (e) {
      try { collab.destroy() } catch {}
    }
  } else {
    try { collab.provider.connect() } catch (e) {}
  }
}

function destroyAll() {
  collab.destroy()
}

onMounted(() => {
  // 监听 awareness 更新并刷新用户列表
  try { collab.provider.awareness.on('change', refreshUsers) } catch (e) {}
  refreshUsers()
})

onBeforeUnmount(() => {
  try { collab.provider.awareness.off('change', refreshUsers) } catch (e) {}
})
</script>

<template>
  <div class="online-collab">
    <h3>在线协作测试面板</h3>
    <p class="note">此组件用于在页面内快速测试协作连接与 awareness（在线用户）。包含中文说明与调试步骤。</p>

    <div class="status">
      <strong>连接状态：</strong>
      <span :class="{ connected: connected, disconnected: !connected }">{{ connected ? '已连接' : '未连接' }}</span>
    </div>

    <div class="controls">
      <button @click="toggleConnection">{{ connected ? '断开连接' : '连接' }}</button>
      <button @click="destroyAll">销毁（关闭 provider & ydoc）</button>
    </div>

    <div class="users">
      <strong>在线用户：</strong>
      <ul>
        <li v-for="(u, id) in users" :key="id">
          <span class="dot" :style="{ background: u.user?.color ?? '#999' }"></span>
          {{ u.user?.name ?? '匿名' }} <small>({{ id }})</small>
        </li>
      </ul>
      <div v-if="!Object.keys(users).length">当前没有其他在线用户（或尚未同步 awareness 状态）</div>
    </div>

    <details class="debug">
      <summary>调试与使用说明（中文）</summary>
      <ol>
        <li>确保本项目已经安装依赖（yjs, y-websocket 等），package.json 中已有依赖。</li>
        <li>在本地或局域网内启动 y-websocket 服务（PowerShell 示例）：
          <pre><code>npx y-websocket --port 1234</code></pre>
        </li>
        <li>在浏览器中打开两个窗口访问本项目（同一局域网内的不同设备或本机的两个窗口都可以），进入编辑页面并使用编辑器同步内容。</li>
        <li>如果 `Editor.vue` 已经使用了 `Collaboration` extension（本仓库默认如此），创建 composable 时请传入 <code>registerPlugins: false</code>，避免重复注册插件。</li>
        <li>公网部署：若需要跨互联网协作，请在公网服务器上部署 y-websocket 并使用 TLS（wss://）。示例（仅供参考）：
          <pre><code>// collab = useCollaborativeDoc({ url: 'wss://collab.example.com', room: 'project-123', registerPlugins: false })</code></pre>
        </li>
      </ol>
      <p>注意：销毁（destroy）会关闭 provider 并尝试销毁 ydoc；若 ydoc 是由 Editor.vue 提供（provide('ydoc', ydoc)），销毁可能影响 Editor 中的文档，慎用。</p>
    </details>
  </div>
</template>

<style scoped>
  .online-collab {
    border: 1px dashed #ddd;
    padding: 12px;
    border-radius: 6px;
    background: #fafafa;
  }
  .note { 
    color: #666; 
  }
  .status span.connected { 
    color: #19a34a 
  }
  .status span.disconnected { 
    color: #b22222 
  }
  .controls { 
    margin: 8px 0 
  }
  .controls button { 
    margin-right: 8px 
  }
  .users { 
    margin-top: 8px 
  }
  .users .dot { 
    display:inline-block; 
    width:10px; 
    height:10px; 
    border-radius:50%; 
    margin-right:6px; 
    vertical-align:middle 
  }
  .debug { 
    margin-top: 12px 
  }
</style>

