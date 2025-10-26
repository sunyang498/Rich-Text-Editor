<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ToolBar from './ToolBar.vue'
import { provideEditor } from '@/composables/EditorContext'

const editor = useEditor({
    content: '<p>开始编辑你的内容...</p >',
    extensions: [
        StarterKit,
    ],
})
provideEditor(editor)
</script>

<template>
    <div class="editor-container">
        <ToolBar></ToolBar>
        <editor-content :editor="editor" class="editor-content" />
    </div>
</template>

<style scoped>
.editor-container {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin: 20px;
}

.editor-content {
    padding: 16px;
    min-height: 200px;
}
</style>