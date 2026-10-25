/**
 * 协同连接（Step3：@hocuspocus/provider）
 * - 房间名 = docId
 * - token = 短时 collab ticket（REST open 文档时下发）
 * - 开发期经 Vite proxy（/collaboration, ws:true）连本地 server
 */
import { onBeforeUnmount, ref } from 'vue'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type * as Y from 'yjs'

/** 供编辑器与在线协作面板共享 provider */
export const CollabProviderKey = Symbol('collabProvider')

/** 构造协同 WS 地址：优先显式 wss 地址，否则按同源 + proxy 路径拼接 */
export function buildCollabUrl(): string {
  const configured = import.meta.env.VITE_COLLAB_URL as string | undefined
  if (configured && /^wss?:\/\//.test(configured)) return configured
  const path = configured || '/collaboration'
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}${path}`
}

export interface CollabOptions {
  ydoc: Y.Doc
  docId: string
  ticket: string
}

export function useCollabProvider(opts: CollabOptions) {
  const connected = ref(false)
  const synced = ref(false)
  const authFailed = ref(false)

  const provider = new HocuspocusProvider({
    url: buildCollabUrl(),
    name: opts.docId,
    document: opts.ydoc,
    token: opts.ticket,
  })

  provider.on('status', (data: { status: string }) => {
    connected.value = data.status === 'connected'
  })
  provider.on('synced', () => {
    synced.value = true
  })
  provider.on('authenticationFailed', () => {
    authFailed.value = true
    connected.value = false
  })

  onBeforeUnmount(() => {
    try {
      provider.destroy()
    } catch {
      /* noop */
    }
  })

  return { provider, connected, synced, authFailed }
}

export default useCollabProvider
