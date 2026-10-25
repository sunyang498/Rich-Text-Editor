<script setup lang="ts">
import { ref, provide, onBeforeUnmount, computed, watch } from 'vue'
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
import { CollabProviderKey, colorForUser, useCollabProvider } from '@/composables/CollabProvider'
import { docsApi } from '@/apis/docs'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ docId?: string; ticket?: string; readOnly?: boolean }>()

const ydoc = new Y.Doc()
provide('ydoc', ydoc)

// Step3：按文档建立协同连接（房间名 = docId；token = collab ticket）
const auth = useAuthStore()
// M2：匿名访客（公开只读）显示为“访客”
const collabUser = auth.user?.nickname || auth.user?.email || '访客'

const collab = props.docId && props.ticket
  ? useCollabProvider({
      ydoc,
      docId: props.docId,
      ticket: props.ticket,
      // P0-2：ticket 60s 过期，重连时重新 open 文档换新票
      getTicket: () => docsApi.open(props.docId!).then((r) => r.collabTicket),
      // Step4：awareness 显示真实昵称 + 稳定颜色
      user: { name: collabUser, color: colorForUser(auth.user?.id ?? collabUser) },
    })
  : null
provide(CollabProviderKey, collab?.provider ?? null)

onBeforeUnmount(() => {
  try { ydoc.destroy() } catch { /* noop */ }
})

const editor = useEditor({
    content: '<p></p>',
    // M2：viewer/匿名 → 编译器层面不可编辑（服务端还会再拦一次上行 update）
    editable: !props.readOnly,
    extensions: [
        // v3 StarterKit 已内置 link / undoRedo：link 由下方自定义配置接管，
        // undoRedo 与 Collaboration 自带历史冲突，故关闭
        StarterKit.configure({
            link: false,
            undoRedo: false,
        }),
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

// 只读态变化时同步（同一组件实例被复用的情况）
watch(
  () => props.readOnly,
  (v) => {
    editor.value?.setEditable(!v)
  }
)

/** M2-4 连接/保存状态文案 */
const statusText = computed(() => {
  if (!collab) return '未连接'
  // 权限被撤销（关公开/文档删除/票据失效）：重连被服务端拒绝，不再冒充“已保存”
  if (collab.authFailed.value && !collab.connected.value) return '无权访问 · 已断开'
  if (!collab.connected.value) return '离线 · 重连中…'
  if (!collab.synced.value) return '同步中…'
  return '已保存'
})
const statusClass = computed(() => {
  if (!collab) return 'off'
  if (!collab.connected.value) return collab.authFailed.value ? 'denied' : 'pending'
  return collab.synced.value ? 'ok' : 'pending'
})

const sidebarOpen = ref(true)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }

</script>

<template>
    <div class="editor-container">
        <div class="editor-header">
            <ToolBar :read-only="!!readOnly" />
            <div class="header-actions">
                <span class="collab-status" :class="statusClass">{{ statusText }}</span>
                <span v-if="readOnly" class="readonly-badge">只读</span>
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

/* M2-4：连接/保存状态 */
.collab-status{
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid transparent;
    white-space: nowrap;
}
.collab-status.ok{ color:#15803d; background:#f0fdf4; border-color:#bbf7d0 }
.collab-status.pending{ color:#b45309; background:#fffbeb; border-color:#fde68a }
.collab-status.off{ color:#6b7280; background:#f3f4f6; border-color:#e5e7eb }
.collab-status.denied{ color:#b91c1c; background:#fef2f2; border-color:#fecaca }

/* M2-3：只读徒标 */
.readonly-badge{
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 999px;
    color:#9a3412;
    background:#fff7ed;
    border:1px solid #fed7aa;
}

div.editor-readonly .editor-content{ background:#fcfcfd }



.editor-main { flex:1; min-width:0 }

.editor-sidebar{
    width: 320px;
    transition: all 220ms ease;
}
.editor-sidebar.closed{ width: 0; opacity: 0; overflow: hidden; padding: 0 }

/* 移动端：侧栏作为底部抽屉显示，且不遮挡顶部 toolbar */
@media (max-width: 800px){
    .editor-body{ flex-direction:column; padding: 12px }
    .editor-sidebar{
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: 12px;
        top: auto;
        width: auto;
        max-width: calc(100% - 24px);
        z-index: 10;
        box-shadow: 0 14px 40px rgba(2,6,23,0.18);
        transition: transform 220ms ease, opacity 220ms ease;
    }
    .editor-sidebar.closed{ transform: translateY(120%); opacity: 0; pointer-events: none }
}

/* 移动端适配 */
@media (max-width: 600px) {
  .editor-container { margin: 12px; border-radius: 8px; }
  .editor-content { padding: 14px; font-size: 15px; min-height: 260px }
}
</style>