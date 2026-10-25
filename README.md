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

---

## 笔砚云版（M1）· 本地运行与部署

> 账号体系 + 云端文档（MySQL 持久化）+ Hocuspocus 实时协同。前端（Web/Electron）共用同一后端；
> 开发期前端 `5173`，后端 `3000`（REST + WSS 同端口）。

### 1. 前置条件

- Node.js **22+**（Hocuspocus v4 要求）
- MySQL（开发：本机 **9.2**；**部署务必与开发同版本**，或上线前在目标版本执行 `prisma migrate deploy` 并回归）
- 初始化库与账号：

```sql
CREATE DATABASE biyan_cloud  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE biyan_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'biyan'@'%' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON biyan_cloud.*  TO 'biyan'@'%';
GRANT ALL PRIVILEGES ON biyan_shadow.* TO 'biyan'@'%';
FLUSH PRIVILEGES;
```

> `biyan_shadow` 供 `prisma migrate dev` 的 shadow database 使用。

### 2. 环境变量

- `server/.env`（**git 忽略**，参考 `server/.env.example`）：
  `DATABASE_URL`、`SHADOW_DATABASE_URL`、`JWT_SECRET`(≥32 随机)、`PORT=3000`、`CORS_ORIGINS`、`COLLAB_TICKET_TTL_MS=60000`
- 前端 `.env`（**git 忽略**，参考 `.env.example`）：
  `VITE_API_BASE=/api/v1`、`VITE_COLLAB_URL=ws://localhost:3000/collaboration`（开发直连）

### 3. 本地初始化与启动

```sh
# 依赖
npm install
npm --prefix server install

# 建表（生产/已有迁移）
npm --prefix server run prisma:deploy
# 开发期修改 schema 时：npm --prefix server run prisma:migrate

# 终端 A：后端（REST /api/v1 + WSS /collaboration，端口 3000）
npm --prefix server run dev

# 终端 B：前端（proxy /api → 3000）
npm run dev
# 打开 http://localhost:5173 → 注册/登录 → 新建文档
```

### 4. 生产部署（单机）

1. 构建并守护后端：`npm --prefix server run build` → `node server/dist/index.js`（pm2/systemd）。
2. 反向代理（Nginx/Caddy）：
   - `https://你的域名/api/` → `http://127.0.0.1:3000`
   - `wss://你的域名/collaboration` → `http://127.0.0.1:3000`（保留 `Upgrade`/`Connection` 头）
3. 前端：构建前设置 `VITE_API_BASE=https://你的域名/api/v1`、`VITE_COLLAB_URL=wss://你的域名/collaboration`，`npm run build` 后静态托管或打入 Electron。
4. 必须：**HTTPS + WSS**（账号与票据不裸奔）；`CORS_ORIGINS` 配白名单。
5. 备份：`mysqldump -ubiyan -p biyan_cloud > backup-$(date +%F).sql`（cron 定时）。

### 5. 常用命令

| 命令 | 说明 |
|---|---|
| `npm --prefix server run dev` | 后端开发（REST + WSS） |
| `npm run dev` | 前端开发（proxy /api） |
| `npm run type-check` | 前端类型检查（vue-tsc） |
| `npx tsc --noEmit -p server/tsconfig.json` | 后端类型检查 |
| `npm --prefix server run prisma:deploy` | 应用迁移（生产） |
| `npm --prefix server run prisma:studio` | 可视化查库 |