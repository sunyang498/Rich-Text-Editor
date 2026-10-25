<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// 启动时恢复登录态（无效 token 会被清理，路由守卫负责跳转登录）
onMounted(() => {
  auth.restore()
})
</script>

<template>
  <router-view />
</template>