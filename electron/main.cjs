/*
 Electron 主进程（CommonJS，文件：electron/main.cjs）
 关键点：
 - 使用 CommonJS 避免与项目的 ESM 设置冲突
 - 窗口安全策略：nodeIntegration: false，contextIsolation: true
 - 通过 preload 脚本向渲染进程暴露必要的受限 API
 - 开发模式加载 Vite 本地服务器（http://localhost:5173）
 - 生产模式加载构建后的静态文件（dist/index.html）
*/

const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    show: false,
    webPreferences: {
      nodeIntegration: false, // 禁用 Node 集成，提升安全性
      contextIsolation: true, // 启用隔离上下文
      preload: path.join(__dirname, 'preload.cjs') // 预加载脚本
    }
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    // 开发模式：连接 Vite dev server
    const url = 'http://localhost:5173'
    win.loadURL(url)
    win.webContents.openDevTools()
  } else {
    // 生产模式：加载构建好的静态文件
    // __dirname 在打包后通常指向 resources/app 或 app.asar
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    win.loadFile(indexPath)
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
