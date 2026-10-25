/**
 * 文档接口
 */
import http from './http'

export interface DocMeta {
  id: string
  title: string
  isPublic: boolean
  lastEditedAt: string
  createdAt: string
}

export interface DocListResult {
  items: DocMeta[]
  nextCursor: string | null
}

export interface OpenDocResult {
  doc: DocMeta
  collabTicket: string
}

export const docsApi = {
  list(params?: { cursor?: string; limit?: number }) {
    return http.get('/docs', { params }).then((r) => r.data.data as DocListResult)
  },
  create(body?: { title?: string }) {
    return http.post('/docs', body ?? {}).then((r) => r.data.data as DocMeta)
  },
  open(id: string) {
    return http.get(`/docs/${id}`).then((r) => r.data.data as OpenDocResult)
  },
  rename(id: string, title: string) {
    return http.patch(`/docs/${id}`, { title }).then((r) => r.data.data as DocMeta)
  },
  remove(id: string) {
    return http.delete(`/docs/${id}`).then(() => undefined)
  },
}

export default docsApi
