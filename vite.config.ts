import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 相对路径，支持 Electron 加载本地静态文件
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
    // 监听 IPv6 双栈：localhost 解析到 ::1 时 WebSocket 也能连（0.0.0.0 只监听 IPv4）
    host: '::',
    port: 5173, // Vite 默认端口（可自定义，如 8080）
    allowedHosts: true, // 开发环境方便，允许所有主机（无需手动加域名）
    // Step3：开发期将 REST 与 WSS 代理到本地 server，避免跨域并统一同源
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/collaboration': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  }
})
