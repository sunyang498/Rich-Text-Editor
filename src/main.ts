
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from '@/apis/http'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 统一 401 失效处理：同步 Pinia 登录态 + 用 router 跳转
setUnauthorizedHandler(() => {
  useAuthStore().clearLocal()
  if (router.currentRoute.value.path !== '/login') {
    void router.replace('/login')
  }
})

app.mount('#app')
