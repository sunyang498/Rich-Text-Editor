<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

// 状态检测
const isBlockquoteActive = computed(() => {
    return editor.value?.isActive('blockquote') || false
})

const isCodeBlockActive = computed(() => {
    return editor.value?.isActive('codeBlock') || false
})

const currentCodeLanguage = computed(() => {
    return editor.value?.getAttributes('codeBlock')?.language || ''
})

// 命令执行
const toggleBlockquote = () => {
    editor.value?.chain().focus().toggleBlockquote().run()
}

const toggleCodeBlock = () => {
    editor.value?.chain().focus().toggleCodeBlock().run()
}

const setHorizontalRule = () => {
    editor.value?.chain().focus().setHorizontalRule().run()
}

const setCodeLanguage = (event: Event) => {
    const language = (event.target as HTMLSelectElement).value
    editor.value?.chain().focus().updateAttributes('codeBlock', { language }).run()
}
</script>

<template>
    <div class="block-elements">
        <!-- 引用块 -->
        <button
            @click="toggleBlockquote"
            :class="['block-button', { 'is-active': isBlockquoteActive }]"
            title="引用块"
        >
            <svg class="block-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
            </svg>
        </button>

        <!-- 代码块 -->
        <button
            @click="toggleCodeBlock"
            :class="['block-button', { 'is-active': isCodeBlockActive }]"
            title="代码块"
        >
            <svg class="block-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
            </svg>
        </button>

        <!-- 水平分割线 -->
        <button
            @click="setHorizontalRule"
            class="block-button"
            title="水平分割线"
        >
            <svg class="block-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 12h18v2H3v-2z"/>
            </svg>
        </button>

        <!-- 代码块语言选择（可选） -->
        <select 
            v-if="isCodeBlockActive" 
            :value="currentCodeLanguage" 
            @change="setCodeLanguage"
            class="language-selector"
            title="选择编程语言"
        >
            <option value="">自动检测</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
        </select>
    </div>
</template>

<style scoped>
.block-elements {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.block-button {
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.block-button:hover {
  background: #e0e0e0;
}

.block-button.is-active {
  background: #007bff;
  color: white;
}

.block-icon {
  font-size: 16px;
}

.language-selector {
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: white;
  font-size: 12px;
  min-width: 100px;
}

.language-selector:focus {
  outline: none;
  border-color: #007bff;
}
</style>