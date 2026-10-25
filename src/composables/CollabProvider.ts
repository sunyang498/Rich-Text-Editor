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
  /** 初始票据（首次连接用） */
  ticket: string
  /** 重连时重新拉取票据（collab ticket 仅 60s，过期后自动续签） */
  getTicket?: () => Promise<string>
}

export function useCollabProvider(opts: CollabOptions) {
  const connected = ref(false)
  const synced = ref(false)
  const authFailed = ref(false)

  // token 支持函数：每次鉴权/重连都会重新取票，天然解决「短时 ticket 过期」
  const getTicket = opts.getTicket ?? (() => Promise.resolve(opts.ticket))

  const provider = new HocuspocusProvider({
    url: buildCollabUrl(),
    name: opts.docId,
    document: opts.ydoc,
    token: getTicket,
  })

  provider.on('status', (data: { status: string }) => {
    connected.value = data.status === 'connected'
    // P1-4：断线/重连期间重置 synced，避免“已同步”状态过期
    if (data.status !== 'connected') synced.value = false
  })
  provider.on('synced', () => {
    synced.value = true
  })

  // P0-2：认证失败时主动重连（token 为函数，会重新拉取新票）；2s 防抖避免失败循环
  let lastRetryAt = 0
  provider.on('authenticationFailed', async () => {
    authFailed.value = true
    connected.value = false
    const now = Date.now()
    if (now - lastRetryAt < 2000) return
    lastRetryAt = now
    try {
      await provider.connect()
    } catch {
      /* 保持失败态，等待下次重连 */
    }
  })

  provider.on('authenticated', () => {
    authFailed.value = false
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
