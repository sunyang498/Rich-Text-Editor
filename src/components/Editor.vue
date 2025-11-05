<script setup lang="ts">
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