/**
 * 文档状态（Pinia）
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { docsApi, type DocMeta } from '@/apis/docs'
import { getErrMsg } from '@/apis/http'

export const useDocsStore = defineStore('docs', () => {
  const items = ref<DocMeta[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchList(reset = true): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const data = await docsApi.list({
        cursor: reset ? undefined : nextCursor.value ?? undefined,
        limit: 20,
      })
      items.value = reset ? data.items : [...items.value, ...data.items]
      nextCursor.value = data.nextCursor
    } catch (e) {
      error.value = getErrMsg(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function create(title?: string): Promise<DocMeta> {
    const doc = await docsApi.create(title ? { title } : undefined)
    items.value = [doc, ...items.value]
    return doc
  }

  async function rename(id: string, title: string): Promise<void> {
    const doc = await docsApi.rename(id, title)
    const idx = items.value.findIndex((d) => d.id === id)
    if (idx >= 0) items.value[idx] = doc
  }

  async function remove(id: string): Promise<void> {
    await docsApi.remove(id)
    items.value = items.value.filter((d) => d.id !== id)
  }

  function open(id: string) {
    return docsApi.open(id)
  }

  return { items, nextCursor, loading, error, fetchList, create, rename, remove, open }
})
