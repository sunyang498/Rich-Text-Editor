/*
 Electron 预加载脚本（CommonJS，文件：electron/preload.cjs）
 说明：
 - 使用 contextBridge 将受限 API 暴露给渲染进程
 - 禁止直接暴露 Node 原生 API（如 require、process 等）
 - 在此处可以按需暴露安全的 ipcRenderer 封装或其它小工具
*/

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 简单示例：send/receive 的安全封装
  send: (channel, data) => {
    const allowed = ['toMain']
    if (allowed.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  on: (channel, callback) => {
    const allowed = ['fromMain']
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  }
})
