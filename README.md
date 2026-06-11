# 笔砚文档 - 富文本编辑器

**笔砚文档**是一个基于 Vue 3 和 Tiptap 的现代化富文本编辑器应用，支持协作编辑、实时同步等功能。该应用采用 Electron 框架打包为桌面应用程序，提供了完整的富文本编辑体验。

## 技术栈与环境要求

### 开发环境
- **操作系统**: Windows 11 / macOS / Linux (支持主流操作系统)
- **编程语言**: 
  - TypeScript ~5.9.0
  - JavaScript (ES6+)
  - Vue 3.5.22
- **主要框架/库及其版本**:
  - Vue 3.5.22
  - Tiptap 编辑器套件 (多个扩展，最新版本)
  - Element Plus 2.11.5
  - Pinia 3.0.3
  - Vue Router 4.6.3
  - Electron 28.2.0
  - Yjs (协同编辑) 13.6.27
  - Node.js ^20.19.0 或 >=22.12.0

## 依赖安装

### 前置要求
确保已安装 Node.js (版本要求: ^20.19.0 或 >=22.12.0)

### 安装步骤
1. **克隆项目**（如果需要）
   ```bash
   git clone <repository-url>
   cd richtexteditor
   ```

2. **安装项目依赖**
   ```bash
   npm install
   ```

   项目使用以下主要依赖包：
   - `@tiptap/*` - 富文本编辑器核心功能
   - `element-plus` - UI 组件库
   - `yjs`, `y-websocket`, `y-prosemirror` - 协作编辑功能
   - `electron` - 桌面应用框架
   - `vite` - 构建工具

## 运行步骤

### 开发模式

#### 1. 启动 WebSocket 服务器 (用于协作编辑)
```bash
npm run start:websocket
```

#### 2. 启动前端开发服务器
```bash
npm run dev
```

#### 3. 启动 Electron 开发模式
```bash
npm run electron:dev
```

### 生产模式

#### 1. 构建前端资源
```bash
npm run build
```

#### 2. 构建 Electron 应用
```bash
npm run electron:build
```

### 项目结构说明
- `src/` - Vue 3 源代码
- `electron/` - Electron 主进程代码
- `public/` - 静态资源文件
- [package.json](file://d:\vueWorkplace\Rich-Text-Editor\RichTextEditor\node_modules\7zip-bin\package.json) - 项目配置和构建脚本

### 特色功能
- **协作编辑** - 基于 Yjs 的实时协作编辑
- **富文本编辑** - 支持格式化、列表、链接、图片等
- **多平台支持** - 可打包为 Windows (NSIS/ZIP)、macOS (DMG/ZIP)、Linux (AppImage/DEB) 应用
- **现代化 UI** - 使用 Element Plus 组件库

### 构建输出
构建后的 Electron 应用将输出到 `electron-dist/` 目录，包含多种格式以适配不同操作系统。

### 应用名称
最终打包的应用名为"笔砚文档"，图标使用项目中的 favicon.ico 文件。


# RichTextEditor

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```