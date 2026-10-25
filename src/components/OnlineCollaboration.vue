<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { CollabProviderKey } from '@/composables/CollabProvider'

interface AwarenessState {
  user?: { name?: string; color?: string; id?: string | number }
}
interface CollabProviderLike {
  awareness: {
    getStates: () => Map<number, AwarenessState>
    on: (event: string, cb: () => void) => void
    off: (event: string, cb: () => void) => void
  }
  on: (event: string, cb: (data: { status: string }) => void) => void
  off: (event: string, cb: (data: { status: string }) => void) => void
}

// 由 Editor.vue 注入（当前文档的 Hocuspocus provider）
const provider = inject<CollabProviderLike | null>(CollabProviderKey, null)

const connected = ref(false)
const users = ref<Record<string, AwarenessState>>({})
const userList = computed(() => Object.entries(users.value))

function refreshUsers(): void {
  if (!provider) {
    users.value = {}
    return
  }
  const entries: Record<string, AwarenessState> = {}
  try {
    for (const [key, val] of provider.awareness.getStates()) {
      entries[String(key)] = val
    }
  } catch {
    /* noop */
  }
  users.value = entries
}

function onStatus(data: { status: string }): void {
  connected.value = data.status === 'connected'
}

/** 服务端下发 CLOSE（权限撤销/文档删除）或鉴权失败：立刻反映为断开 */
function markDisconnected(): void {
  connected.value = false
}

onMounted(() => {
  if (!provider) return
  provider.on('status', onStatus)
  provider.on('close', markDisconnected)
  provider.on('authenticationFailed', markDisconnected)
  try {
    provider.awareness.on('change', refreshUsers)
  } catch {
    /* noop */
  }
  refreshUsers()
})

onBeforeUnmount(() => {
  if (!provider) return
  try {
    provider.off('status', onStatus)
    provider.off('close', markDisconnected)
    provider.off('authenticationFailed', markDisconnected)
  } catch {
    /* noop */
  }
  try {
    provider.awareness.off('change', refreshUsers)
  } catch {
    /* noop */
  }
})
</script>

<template>
  <div class="online-collab">
    <h3>在线协作</h3>
    <p class="note">实时连接状态与在线成员（昵称/光标颜色）。</p>

    <div class="status">
      <strong>连接状态：</strong>
      <span :class="{ connected: connected, disconnected: !connected }">{{ connected ? '已连接' : '未连接' }}</span>
    </div>

    <div class="users">
      <strong>在线用户：</strong>
      <ul>
        <li v-for="[id, u] in userList" :key="id">
          <span class="dot" :style="{ background: u.user?.color ?? '#999' }"></span>
          {{ u.user?.name ?? '匿名' }}
        </li>
      </ul>
      <div v-if="!userList.length">当前没有其他在线用户（或尚未同步 awareness 状态）</div>
    </div>

    <!-- <details class="debug">
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
    </details> -->
  </div>
</template>

<style scoped>
  .online-collab {
    border-radius: 8px;
    background: rgba(250,250,251,0.9);
    padding: 12px;
    border: 1px solid rgba(16,24,40,0.04);
    box-shadow: 0 4px 12px rgba(2,6,23,0.04);
    max-width: 420px;
  }
  .note { color: #6b7280; font-size: 13px }
  .status { margin-top: 6px; margin-bottom: 8px }
  .status span.connected { color: #10b981; font-weight: 600 }
  .status span.disconnected { color: #ef4444; font-weight: 600 }
  .controls { margin: 10px 0; display:flex; gap:8px; flex-wrap:wrap }
  .controls button { padding: 8px 10px; border-radius:6px; border:none; cursor:pointer }
  .controls button:first-child { background: linear-gradient(90deg,#0ea5e9,#0b74ff); color:white }
  .controls button:last-child { background: #fff; border:1px solid rgba(16,24,40,0.06) }
  .users { margin-top: 8px; max-height: 140px; overflow:auto }
  .users ul { padding-left: 12px; margin: 6px 0 }
  .users li { display:flex; align-items:center; gap:8px; padding: 6px 4px; border-radius:6px }
  .users li + li { border-top: 1px dashed rgba(16,24,40,0.03) }
  .users .dot { display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px; vertical-align:middle }
  .debug { margin-top: 12px; font-size:13px }

  /* 移动端：底部抽屉样式（占据屏幕底部一小部分，不遮挡顶端工具栏） */
  @media (max-width: 600px) {
    .online-collab {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      width: auto;
      max-width: calc(100% - 24px);
      max-height: 45vh;
      overflow: auto;
      border-radius: 12px 12px 6px 6px;
      z-index: 11; /* 放在 toolbar 之下（toolbar 的 z-index 为 12） */
    }
    .controls { gap:6px }
    .controls button { flex: 1 1 auto }
  }
</style>

