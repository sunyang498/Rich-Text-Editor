import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0', // 关键：允许局域网设备访问（监听所有IP）
    port: 5173, // Vite 默认端口（可自定义，如 8080）
    allowedHosts: true // 开发环境方便，允许所有主机（无需手动加域名）
  }
})
