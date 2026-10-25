<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Editor from '@/components/Editor.vue'
import { useDocsStore } from '@/stores/docs'
import { useAuthStore } from '@/stores/auth'
import { getErrMsg } from '@/apis/http'
import type { DocRole } from '@/apis/docs'

const props = defineProps<{ id: string }>()
const router = useRouter()
const docs = useDocsStore()
const auth = useAuthStore()

const title = ref('')
const ticket = ref('')
const role = ref<DocRole>('owner')
const isPublic = ref(false)
const ready = ref(false)
const error = ref('')

/** M2：viewer（公开只读/匿名）→ 只读态 */
const readOnly = computed(() => role.value === 'viewer')
const anonymous = computed(() => !auth.isLoggedIn)

async function open(id: string): Promise<void> {
  ready.value = false
  error.value = ''
  title.value = ''
  ticket.value = ''
  role.value = 'owner'
  isPublic.value = false
  try {
    const { doc, collabTicket, role: docRole } = await docs.open(id)
    title.value = doc.title
    isPublic.value = doc.isPublic
    role.value = docRole
    ticket.value = collabTicket
    ready.value = true
  } catch (e) {
    error.value = getErrMsg(e)
  }
}

onMounted(() => open(props.id))

// P0-1：/docs/:id 是同一路由记录，A→B 会复用组件实例（onMounted 不再触发）
// 因此必须监听参数变化重新打开；模板再用 :key="id" 强制重建 Editor（ydoc/provider 全部重来）
watch(
  () => props.id,
  (id) => {
    if (id) open(id)
  }
)

async function backToList(): Promise<void> {
  // 匿名访客没有“我的文档”，直接去登录页
  await router.push(anonymous.value ? '/login' : '/docs')
}
</script>

<template>
  <div class="editor-page">
    <header class="editor-topbar">
      <button @click="backToList">{{ anonymous ? '登录 / 注册' : '← 我的文档' }}</button>
      <h2>{{ title || '文档' }}</h2>
      <span v-if="readOnly" class="badge readonly">只读</span>
      <span v-if="isPublic" class="badge public">公开</span>
      <span class="spacer" />
      <span v-if="anonymous" class="hint-inline">访客模式：登录后可创建自己的文档</span>
    </header>

    <p v-if="error" class="error">
      {{ error }}
      <button v-if="anonymous" class="error-action" @click="router.push('/login')">{{'去登录'}}</button>
    </p>

    <Editor v-else-if="ready" :key="id" :doc-id="id" :ticket="ticket" :read-only="readOnly" />

    <div v-else class="hint">正在打开文档…</div>
  </div>
</template>

<style scoped>
.editor-page {
  min-height: 100vh;
  background: #f7f9fc;
}
.editor-topbar {
  max-width: 1100px;
  margin: 0 auto;
  padding: 14px 20px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.editor-topbar button {
  padding: 7px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.editor-topbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spacer {
  flex: 1;
}
.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge.readonly {
  color: #9a3412;
  background: #fff7ed;
  border-color: #fed7aa;
}
.badge.public {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.hint-inline {
  font-size: 12px;
  color: #6b7280;
}
.error {
  max-width: 1100px;
  margin: 24px auto;
  padding: 12px 20px;
  color: #dc2626;
}
.error-action {
  margin-left: 12px;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
  border-radius: 6px;
  cursor: pointer;
}
.hint {
  text-align: center;
  color: #6b7280;
  padding: 60px 0;
}
</style>
