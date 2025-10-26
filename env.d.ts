/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    // 声明 .vue 文件导出的是 Vue 组件类型
    const component: DefineComponent<{}, {}, any>
    export default component
}
