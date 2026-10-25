import { createRouter, createWebHashHistory } from 'vue-router'
import { tokenStore } from '@/apis/http'

const router = createRouter({
  // Electron(file://) 与静态部署兼容：使用 hash 模式
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/docs' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    { path: '/docs', name: 'docs', component: () => import('@/views/DocsListView.vue') },
    {
      path: '/docs/:id',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
      props: true,
    },
    { path: '/:pathMatch(.*)*', redirect: '/docs' },
  ],
})

// 全局守卫：未登录 → /login；已登录访问 /login → /docs
router.beforeEach((to) => {
  const hasToken = !!tokenStore.getAccess()
  if (!to.meta.public && !hasToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && hasToken) return { path: '/docs' }
  return true
})

export default router
