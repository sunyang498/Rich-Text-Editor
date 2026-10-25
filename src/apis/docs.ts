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

/** 当前连接者在文档上的角色（M2：owner 可写 / viewer 只读） */
export type DocRole = 'owner' | 'viewer'

export interface OpenDocResult {
  doc: DocMeta
  role: DocRole
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
  setPublic(id: string, isPublic: boolean) {
    return http
      .patch(`/docs/${id}/public`, { isPublic })
      .then((r) => r.data.data as DocMeta)
  },
  remove(id: string) {
    return http.delete(`/docs/${id}`).then(() => undefined)
  },
}

export default docsApi
