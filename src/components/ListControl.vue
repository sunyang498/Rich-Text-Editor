<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

// 检查是否支持任务列表
const hasTaskList = computed(() => {
    return !!editor.value?.extensionManager.extensions.find(ext => ext.name === 'taskList')
})

// 状态检测
const isBulletListActive = computed(() => {
    return editor.value?.isActive('bulletList') || false
})
const isOrderedListActive = computed(() => {
    return editor.value?.isActive('orderedList') || false
})
const isTaskListActive = computed(() => {
    return editor.value?.isActive('taskList') || false
})

// 缩进能力检测
const canIncreaseIndent = computed(() => {
    return editor.value?.can().sinkListItem('listItem') || false
})
const canDecreaseIndent = computed(() => {
    return editor.value?.can().liftListItem('listItem') || false
})

// 命令执行
const toggleBulletList = () => {
    editor.value?.chain().focus().toggleBulletList().run()
}
const toggleOrderedList = () => {
    editor.value?.chain().focus().toggleOrderedList().run()
}
const toggleTaskList = () => {
    editor.value?.chain().focus().toggleTaskList().run()
}
const increaseIndent = () => {
    editor.value?.chain().focus().sinkListItem('listItem').run()
}
const decreaseIndent = () => {
    editor.value?.chain().focus().liftListItem('listItem').run()
}
</script>

<template>
    <div class="list-controls">
        <!-- 无序列表 -->
        <button
            @click="toggleBulletList"
            :class="['list-button', { 'is-active': isBulletListActive }]"
            title="无序列表"
        >
            <svg class="list-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
            </svg>
        </button>

        <!-- 有序列表 -->
        <button
            @click="toggleOrderedList"
            :class="['list-button', { 'is-active': isOrderedListActive }]"
            title="有序列表"
        >
            <svg class="list-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
            </svg>
        </button>

        <!-- 任务列表（如果需要） -->
        <button
            v-if="hasTaskList"
            @click="toggleTaskList"
            :class="['list-button', { 'is-active': isTaskListActive }]"
            title="任务列表"
        >
            <svg class="list-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        </button>

        <!-- 缩进控制 -->
        <button
            @click="increaseIndent"
            class="list-button"
            title="增加缩进"
            :disabled="!canIncreaseIndent"
        >
            <svg class="list-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 12h18v2H3v-2zm0-5h12v2H3V7zm0 10h12v2H3v-2z"/>
            </svg>
        </button>

        <button
            @click="decreaseIndent"
            class="list-button"
            title="减少缩进"
            :disabled="!canDecreaseIndent"
        >
            <svg class="list-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 12h18v2H3v-2zm6-5h12v2H9V7zm-6 10h18v2H3v-2z"/>
            </svg>
        </button>
    </div>
</template>

<style scoped>
.list-controls {
  display: flex;
  gap: 2px;
  background: #f5f5f5;
  padding: 2px;
  border-radius: 4px;
}

.list-button {
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-button:hover:not(:disabled) {
  background: #e0e0e0;
}

.list-button.is-active {
  background: #007bff;
  color: white;
}

.list-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.list-icon {
  font-size: 16px;
}
</style>