<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const nickname = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  if (submitting.value) return
  if (!email.value.trim() || !password.value) return
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value.trim(), password.value)
    } else {
      await auth.register(email.value.trim(), password.value, nickname.value.trim() || undefined)
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/docs'
    await router.replace(redirect)
  } catch {
    // 错误信息已写入 auth.error
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <h1>笔砚文档</h1>
      <p class="sub">登录后管理你的云端文档</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <form @submit.prevent="submit">
        <label>
          邮箱
          <input v-model="email" type="email" autocomplete="username" placeholder="you@example.com" />
        </label>
        <label v-if="mode === 'register'">
          昵称（可选）
          <input v-model="nickname" type="text" placeholder="协同光标显示的昵称" />
        </label>
        <label>
          密码
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="至少 8 位"
          />
        </label>

        <p v-if="auth.error" class="error">{{ auth.error }}</p>

        <button class="submit" type="submit" :disabled="submitting || auth.loading">
          {{ submitting || auth.loading ? '处理中…' : mode === 'login' ? '登录' : '注册并登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #eef4ff, #f7f9fc);
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 12px 40px rgba(16, 24, 40, 0.08);
}
h1 {
  margin: 0 0 4px;
  font-size: 24px;
}
.sub {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 13px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.tabs button {
  flex: 1;
  padding: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
}
.tabs button.active {
  border-color: #2563eb;
  color: #2563eb;
  font-weight: 600;
}
form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}
input {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}
input:focus {
  border-color: #2563eb;
}
.error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
}
.submit {
  margin-top: 4px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
