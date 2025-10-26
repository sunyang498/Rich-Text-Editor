<script setup lang="ts">
import MarkButton from './MarkButton.vue'
import { useEditorContext } from '@/composables/EditorContext'
import ColorPicker from './ColorPicker.vue'
import FontSizePicker from './FontSizePicker.vue'
import FontFamilyPicker from './FontFamilyPicker.vue'

// 获取编辑器实例
const editor = useEditorContext()

</script>

<template>
    <div class="toolbar">
        <!-- 使用按钮组件 -->
        <MarkButton 
            :command="() => editor?.chain().focus().toggleBold().run()"
            :is-active="editor?.isActive('bold')"
            label="粗体"
        />
        
        <MarkButton 
            :command="() => editor?.chain().focus().toggleItalic().run()"
            :is-active="editor?.isActive('italic')"
            label="斜体"
        />
        
        <MarkButton 
            :command="() => editor?.chain().focus().toggleUnderline().run()"
            :is-active="editor?.isActive('underline')"
            label="下划线"
        />

        <MarkButton 
            :command="() => editor?.chain().focus().toggleStrike().run()"
            :is-active="editor?.isActive('strike')"
            label="删除线"
        />

        <MarkButton 
            :command="() => editor?.chain().focus().toggleCode().run()"
            :is-active="editor?.isActive('code')"
            label="代码"
        />

        <ColorPicker type="text"></ColorPicker>
        <ColorPicker type="background"></ColorPicker>
        <FontSizePicker></FontSizePicker>
        <FontFamilyPicker></FontFamilyPicker>
    </div>
</template>

<style scoped>
.toolbar {
    padding: 8px;
    border-bottom: 1px solid #e0e0e0;
    background: #f9f9f9;
    display: flex;
    gap: 8px;
}
</style>