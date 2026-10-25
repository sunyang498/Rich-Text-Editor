/**
 * 认证接口
 */
import http from './http'

export interface UserInfo {
  id: string
  email: string
  nickname: string
  createdAt?: string
}

export interface Tokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResult {
  user: UserInfo
  tokens: Tokens
}

export const authApi = {
  register(body: { email: string; password: string; nickname?: string }) {
    return http.post('/auth/register', body).then((r) => r.data.data as AuthResult)
  },
  login(body: { email: string; password: string }) {
    return http.post('/auth/login', body).then((r) => r.data.data as AuthResult)
  },
  logout(refreshToken: string) {
    return http.post('/auth/logout', { refreshToken }).then(() => undefined)
  },
  me() {
    return http.get('/auth/me').then((r) => r.data.data as UserInfo)
  },
}

export default authApi
