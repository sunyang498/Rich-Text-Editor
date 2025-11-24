<script setup lang="ts">
import { ref } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle,BackgroundColor } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import ToolBar from './ToolBar.vue'
import { provideEditor } from '@/composables/EditorContext'
import { FontSize } from '@/composables/FontSize';
import { FontFamily } from '@/composables/FontFamily';
import { LineHeight } from '@/composables/LineHeight';
import TextAlign from '@tiptap/extension-text-align'
import { TextIndent } from '@/composables/TextIndent';
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import OnlineCollaboration from './OnlineCollaboration.vue';
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import { provide } from 'vue';

const ydoc=new Y.Doc()
provide('ydoc',ydoc)

const editor = useEditor({
    content: '<p>开始编辑你的内容...</p >',
    extensions: [
        StarterKit,
        TextStyle,
        BackgroundColor,
        FontSize,
        FontFamily,
        LineHeight,
        TextIndent,
        Color.configure({
          types: ['textStyle'] // 允许 textStyle 扩展使用颜色属性
        }),
        TextAlign.configure({
            types:['heading','paragraph'],
            alignments:['left','center','right','justify'],
            defaultAlignment:'left'
        }),
        Image.configure({
            HTMLAttributes:{
                class:'editor-image',
                loading:'lazy'
            },
            inline:false,
            allowBase64:true
        }),
        Link.configure({
            openOnClick:true,
            HTMLAttributes:{
                class:'editor-link',
                rel:'noopener noreferrer nofollow'
            }
        }),
        Collaboration.configure({
            document:ydoc
        })
    ],
})
provideEditor(editor)

const sidebarOpen = ref(true)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }

</script>

<template>
    <div class="editor-container">
        <div class="editor-header">
            <ToolBar />
            <div class="header-actions">
                <button class="sidebar-toggle" @click="toggleSidebar" :aria-pressed="sidebarOpen">
                    {{ sidebarOpen ? '隐藏协作' : '显示协作' }}
                </button>
            </div>
        </div>

        <div class="editor-body">
            <main class="editor-main">
                <editor-content :editor="editor" class="editor-content" />
            </main>

            <aside class="editor-sidebar" :class="{ closed: !sidebarOpen }">
                <OnlineCollaboration />
            </aside>
        </div>
    </div>
</template>

<style scoped>
.editor-container {
    max-width: 1100px;
    margin: 20px auto;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 6px 18px rgba(13, 38, 59, 0.06);
    overflow: hidden;
    border: 1px solid rgba(16,24,40,0.06);
    display: flex;
    flex-direction: column;
}

.editor-content {
    padding: 20px;
    min-height: 360px;
    line-height: 1.8;
    font-size: 16px;
    color: #111827;
}

.editor-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(16,24,40,0.04);
    background: linear-gradient(180deg,#fff,#fbfdff);
}

.header-actions {
    display:flex;align-items:center;gap:8px;
    position: relative;
    z-index: 3; /* 提升到工具栏之上，避免被覆盖 */
}

/* 当 ToolBar 作为 header 的第一个子元素时，让其自动占用剩余空间，且可横向滚动 */
.editor-header > .toolbar {
  flex: 1 1 auto;
  min-width: 0; /* 允许子元素缩小以触发滚动 */
  z-index: 1;
}

.sidebar-toggle{
    background: transparent;
    border: 1px solid rgba(16,24,40,0.06);
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
}

.editor-body {
    display:flex;
    gap:16px;
    padding: 18px;
}

.editor-main { flex:1; min-width:0 }

.editor-sidebar{
    width: 320px;
    transition: all 220ms ease;
}
.editor-sidebar.closed{ width: 0; opacity: 0; overflow: hidden; padding: 0 }

/* 移动端：侧栏以覆盖层形式显示 */
/* @media (max-width: 800px){
    .editor-body{ flex-direction:column; padding: 12px }
    .editor-sidebar{ position: fixed; right: 12px; top: 90px; width: 92%; max-width: 360px; z-index: 80; box-shadow: 0 10px 30px rgba(2,6,23,0.2) }
    .editor-sidebar.closed{ transform: translateY(-12px); opacity: 0; pointer-events: none }
} */

/* 移动端适配 */
/* @media (max-width: 600px) {
  .editor-container { margin: 12px; border-radius: 8px; }
  .editor-content { padding: 14px; font-size: 15px; min-height: 260px }
} */
</style>