<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Editor from '@/components/Editor.vue'
import { useDocsStore } from '@/stores/docs'
import { getErrMsg } from '@/apis/http'

const props = defineProps<{ id: string }>()
const router = useRouter()
const docs = useDocsStore()

const title = ref('')
const ticket = ref('')
const ready = ref(false)
const error = ref('')

async function open(id: string): Promise<void> {
  ready.value = false
  error.value = ''
  title.value = ''
  ticket.value = ''
  try {
    const { doc, collabTicket } = await docs.open(id)
    title.value = doc.title
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
  await router.push('/docs')
}
</script>

<template>
  <div class="editor-page">
    <header class="editor-topbar">
      <button @click="backToList">← 我的文档</button>
      <h2>{{ title || '文档' }}</h2>
      <span class="spacer" />
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <Editor v-else-if="ready" :key="id" :doc-id="id" :ticket="ticket" />

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
.error {
  max-width: 1100px;
  margin: 24px auto;
  padding: 12px 20px;
  color: #dc2626;
}
.hint {
  text-align: center;
  color: #6b7280;
  padding: 60px 0;
}
</style>
