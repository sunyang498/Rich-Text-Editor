/**
 * 认证状态（Pinia）
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, type AuthResult, type UserInfo } from '@/apis/auth'
import { getErrMsg, tokenStore } from '@/apis/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const loggedIn = ref(!!tokenStore.getAccess())
  const loading = ref(false)
  const error = ref('')
  const isLoggedIn = computed(() => loggedIn.value)

  async function apply(result: AuthResult): Promise<void> {
    tokenStore.setTokens(result.tokens)
    user.value = result.user
    loggedIn.value = true
  }

  async function register(email: string, password: string, nickname?: string): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await apply(await authApi.register({ email, password, nickname }))
    } catch (e) {
      error.value = getErrMsg(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await apply(await authApi.login({ email, password }))
    } catch (e) {
      error.value = getErrMsg(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 应用启动时恢复会话（校验 access token 有效性） */
  async function restore(): Promise<void> {
    if (!tokenStore.getAccess()) {
      loggedIn.value = false
      return
    }
    try {
      user.value = await authApi.me()
      loggedIn.value = true
    } catch {
      tokenStore.clear()
      user.value = null
      loggedIn.value = false
    }
  }

  async function logout(): Promise<void> {
    const refreshToken = tokenStore.getRefresh()
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } finally {
      tokenStore.clear()
      user.value = null
      loggedIn.value = false
    }
  }

  return { user, loading, error, isLoggedIn, register, login, restore, logout }
})
