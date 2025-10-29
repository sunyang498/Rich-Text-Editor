<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

// 是否显示当前缩进值
const showCurrentValue = true

// 获取当前缩进值
const currentIndent = computed(() => {
    return editor.value?.getAttributes('textStyle')?.textIndent || '0em'
})

// 提取数字部分用于显示和计算
const currentIndentValue = computed(() => {
    const match = currentIndent.value.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : 0
})

// 减少缩进
const decreaseIndent = () => {
    editor.value?.chain().focus().decreaseIndent().run()
}

// 增加缩进
const increaseIndent = () => {
    editor.value?.chain().focus().increaseIndent().run()
}
</script>

<template>
    <div class="text-indent-picker">
        <button
            @click="decreaseIndent"
            :class="['indent-button', { 'is-disabled': currentIndentValue === 0 }]"
            title="减少缩进"
        >
            <svg class="indent-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 12h18v2H3v-2zm0-5h12v2H3V7zm0 10h12v2H3v-2z" fill="currentColor" />
            </svg>
        </button>
        
        <button
            @click="increaseIndent"
            class="indent-button"
            title="增加缩进"
        >
            <svg class="indent-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 12h18v2H3v-2zm6-5h12v2H9V7zm-6 10h18v2H3v-2z" fill="currentColor" />
            </svg>
        </button>
        
        <!-- 可选：显示当前缩进值 -->
        <span class="indent-value" v-if="showCurrentValue">
            {{ currentIndentValue }}em
        </span>
    </div>
</template>

<style scoped>
.text-indent-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.indent-button {
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indent-button:hover:not(.is-disabled) {
  background: #e0e0e0;
}

.indent-button.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.indent-icon {
  font-size: 16px;
}

.indent-value {
  font-size: 12px;
  color: #666;
  min-width: 30px;
  text-align: center;
}
</style>