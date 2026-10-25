/**
 * Axios 实例
 * - 统一 baseURL（Vite proxy 同源 /api/v1）
 * - 请求自动注入 Bearer accessToken
 * - 401 自动用 refreshToken 换新并重放一次；失败则清空登录态
 */
import axios from 'axios'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1'

const ACCESS_KEY = 'biyan.accessToken'
const REFRESH_KEY = 'biyan.refreshToken'

export const tokenStore = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setTokens(t: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem(ACCESS_KEY, t.accessToken)
    localStorage.setItem(REFRESH_KEY, t.refreshToken)
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** 由 main.ts 注册：同步清空 Pinia 登录态并用 router 跳转（避免 location.hash 绕过路由） */
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  unauthorizedHandler = fn
}

function notifyUnauthorized(): void {
  if (unauthorizedHandler) {
    unauthorizedHandler()
    return
  }
  if (!location.hash.startsWith('#/login')) location.hash = '#/login'
}

export const http = axios.create({ baseURL: BASE, timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** 并发 401 时只刷新一次 */
let refreshing: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    const refreshToken = tokenStore.getRefresh()
    refreshing = (async () => {
      if (!refreshToken) throw new Error('no refresh token')
      // 用裸 axios，避免被本实例拦截器再次拦截
      const res = await axios.post(`${BASE}/auth/refresh`, { refreshToken })
      const tokens = res.data?.data?.tokens
      if (!tokens?.accessToken) throw new Error('refresh failed')
      tokenStore.setTokens(tokens)
      return tokens.accessToken as string
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config as (Record<string, unknown> & { _retry?: boolean }) | undefined
    const status = error?.response?.status as number | undefined

    if (status === 401 && config && !config._retry && tokenStore.getRefresh()) {
      config._retry = true
      try {
        const newToken = await refreshAccessToken()
        config.headers = (config.headers as Record<string, string>) ?? {}
        ;(config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        return http(config as never)
      } catch (e) {
        // P1-1：仅凭证失效（401/403）清登录态；网络抖动保留 token，待用户重试
        const status = (e as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) {
          tokenStore.clear()
          notifyUnauthorized()
        }
      }
    }
    return Promise.reject(error)
  }
)

/** 从后端统一响应中提取错误信息 */
export function getErrMsg(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || '请求失败'
}

export default http
