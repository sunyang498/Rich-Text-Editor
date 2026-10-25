<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDocsStore } from '@/stores/docs'
import { getErrMsg } from '@/apis/http'

const auth = useAuthStore()
const docs = useDocsStore()
const router = useRouter()
const busy = ref(false)

onMounted(() => {
  docs.fetchList().catch(() => undefined)
})

function fmt(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const showCreate = ref(false)
const newTitle = ref('')

function openCreate(): void {
  newTitle.value = ''
  showCreate.value = true
}

function closeCreate(): void {
  if (busy.value) return
  showCreate.value = false
}

async function submitCreate(): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    // 留空则由后端回落为“无标题文档”
    const doc = await docs.create(newTitle.value.trim() || undefined)
    showCreate.value = false
    await router.push(`/docs/${doc.id}`)
  } catch (e) {
    alert(getErrMsg(e))
  } finally {
    busy.value = false
  }
}

async function renameDoc(id: string, current: string): Promise<void> {
  const next = window.prompt('重命名文档', current)
  if (!next || !next.trim() || next.trim() === current) return
  try {
    await docs.rename(id, next.trim())
  } catch (e) {
    alert(getErrMsg(e))
  }
}

async function removeDoc(id: string, title: string): Promise<void> {
  if (!window.confirm(`确定删除「${title}」吗？删除后不可在列表看到。`)) return
  try {
    await docs.remove(id)
  } catch (e) {
    alert(getErrMsg(e))
  }
}

// M2：公开只读开关（owner）
async function togglePublic(id: string, current: boolean): Promise<void> {
  try {
    await docs.setPublic(id, !current)
  } catch (e) {
    alert(getErrMsg(e))
  }
}

/** 公开只读链接（# 路由：与 Electron / 静态部署兼容） */
function shareUrl(id: string): string {
  return `${location.origin}${location.pathname}#/docs/${id}`
}

async function copyLink(id: string): Promise<void> {
  const url = shareUrl(id)
  try {
    await navigator.clipboard.writeText(url)
    alert('已复制公开链接（无需登录即可阅读）：\n' + url)
  } catch {
    // 非 HTTPS / 无剪贴板权限时的降级
    window.prompt('手动复制公开链接', url)
  }
}

async function logout(): Promise<void> {
  await auth.logout()
  await router.replace('/login')
}
</script>

<template>
  <div class="docs-page">
    <header class="topbar">
      <div>
        <h1>我的文档</h1>
        <p class="hello">你好，{{ auth.user?.nickname || auth.user?.email || '用户' }}</p>
      </div>
      <div class="actions">
        <button class="primary" :disabled="busy" @click="openCreate">＋ 新建文档</button>
        <button @click="logout">退出登录</button>
      </div>
    </header>

    <p v-if="docs.error" class="error">{{ docs.error }}</p>

    <div v-if="docs.loading && docs.items.length === 0" class="hint">加载中…</div>
    <div v-else-if="docs.items.length === 0" class="empty">
      <p>还没有文档</p>
      <button class="primary" @click="openCreate">创建第一篇</button>
    </div>

    <ul v-else class="doc-list">
      <li v-for="d in docs.items" :key="d.id" class="doc-item">
        <button class="doc-main" @click="router.push(`/docs/${d.id}`)">
          <span class="title">
            {{ d.title }}
            <span v-if="d.isPublic" class="badge-public">公开</span>
          </span>
          <span class="meta">最近编辑 {{ fmt(d.lastEditedAt) }}</span>
        </button>
        <div class="item-actions">
          <button @click="togglePublic(d.id, d.isPublic)">
            {{ d.isPublic ? '取消公开' : '设为公开' }}
          </button>
          <button v-if="d.isPublic" @click="copyLink(d.id)">复制链接</button>
          <button @click="renameDoc(d.id, d.title)">重命名</button>
          <button class="danger" @click="removeDoc(d.id, d.title)">删除</button>
        </div>
      </li>
    </ul>

    <div v-if="docs.nextCursor" class="more">
      <button :disabled="docs.loading" @click="docs.fetchList(false)">
        {{ docs.loading ? '加载中…' : '加载更多' }}
      </button>
    </div>

    <!-- 新建文档：创建时即可设置名称 -->
    <div v-if="showCreate" class="modal-mask" @click.self="closeCreate">
      <form class="modal" @submit.prevent="submitCreate">
        <h3>新建文档</h3>
        <input
          v-model="newTitle"
          type="text"
          maxlength="255"
          placeholder="文档名称（留空则为“无标题文档”）"
          autofocus
        />
        <div class="modal-actions">
          <button type="button" @click="closeCreate">取消</button>
          <button type="submit" class="primary" :disabled="busy">创建</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.docs-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 20px 60px;
}
.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
h1 {
  margin: 0;
  font-size: 24px;
}
.hello {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  padding: 8px 14px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
button.danger {
  color: #dc2626;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #dc2626;
  font-size: 13px;
}
.hint,
.empty {
  padding: 48px 0;
  text-align: center;
  color: #6b7280;
}
.doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  padding: 12px 14px;
  transition: box-shadow 0.15s ease;
}
.doc-item:hover {
  box-shadow: 0 6px 20px rgba(16, 24, 40, 0.06);
}
.doc-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
}
.doc-main .title {
  font-size: 15px;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.badge-public {
  font-size: 11px;
  font-weight: 400;
  padding: 1px 7px;
  border-radius: 999px;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  flex: none;
}
.doc-main .meta {
  font-size: 12px;
  color: #9ca3af;
}
.item-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.more {
  text-align: center;
  margin-top: 16px;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: grid;
  place-items: center;
  z-index: 100;
}
.modal {
  width: min(360px, calc(100vw - 40px));
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.25);
}
.modal h3 {
  margin: 0 0 14px;
  font-size: 16px;
}
.modal input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}
.modal input:focus {
  border-color: #2563eb;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
