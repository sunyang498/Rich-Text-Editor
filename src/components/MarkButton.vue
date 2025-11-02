<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

// 定义组件接收的属性（Props）
interface Props {
    command: () => void        // command 是一个没有参数、没有返回值的函数
    isActive?: boolean         // isActive 是可选的布尔值
    label?: string             // label 是可选的字符串
}

// 使用 defineProps 来声明组件接收的属性
const props = defineProps<Props>()

// 获取编辑器实例
const editor = useEditorContext()

// 处理点击事件
const handleClick = () => {
    if (editor.value && props.command) {
        props.command()
    }
}

// 计算属性：按钮是否禁用（编辑器不存在时禁用）
const disabled = computed(() => !editor.value)

// 计算属性：按钮的激活状态
const computedIsActive = computed(() => props.isActive || false)
</script>

<template>
    <button 
        @click="handleClick"
        :class="{ 'is-active': computedIsActive }"
        :disabled="disabled"
        class="toolbar-mark-button"
    >
        <!-- 插槽：可以自定义按钮内容 -->
        <slot>{{ label }}</slot>
    </button>
</template>

<style scoped>
.toolbar-mark-button {
    padding: 8px 12px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
}

.toolbar-mark-button:hover {
    background: #f5f5f5;
}

.toolbar-mark-button.is-active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.toolbar-mark-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>