<script setup lang="ts">
import { useEditorContext } from '@/composables/EditorContext';
import { ref,computed } from 'vue'

const editor=useEditorContext()
const isFPerActive=ref(false)
const isClear=ref(false)
const attribute=ref<Record<string,any>|null>(null)
const isUndoable=computed(()=>{
    return editor.value?.can().undo()
})
const handleCancel=()=>{
    if(isUndoable){
        editor.value?.chain().focus().undo().run()
    }
}
const selectAll=()=>{
    editor.value?.chain().focus().selectAll().run()
}
const formatPainter=()=>{
    if(!isFPerActive.value){
        const formats:Record<string,any>={}
        if(editor.value?.isActive('bold'))
            formats.bold=true
        if(editor.value?.isActive('italic'))
            formats.italic=true
        if(editor.value?.isActive('underline'))
            formats.underline=true
        if(editor.value?.isActive('textStyle'))
            formats.textStyle=editor.value.getAttributes('textStyle')
        attribute.value=formats
        console.log(formats)
        isFPerActive.value=!isFPerActive.value
        console.log(isFPerActive.value)
    }else{
        editor.value?.chain().focus().setMark('textStyle',attribute.value?.textStyle).run()
        if(attribute.value?.italic)
            editor.value?.chain().focus().setItalic().run()
        if(attribute.value?.underline)
            editor.value?.chain().focus().setUnderline().run()
        isFPerActive.value=!isFPerActive.value
        attribute.value={}
    }
}
const formatClear=()=>{
    editor.value?.chain().focus().unsetAllMarks().run()
}
</script>

<template>
    <button 
        @click="handleCancel"
        class="toolbar-mark-button"
        :class="{'is-active':isUndoable}"
    >
        撤销
    </button>
    <button 
        @click="selectAll"
        class="toolbar-mark-button"
    >
        全选
    </button>
    <button 
        @click="formatPainter"
        class="toolbar-mark-button"
        :class="{'is-active':isFPerActive}"
    >
        格式刷
    </button>
    <button 
        @click="formatClear"
        class="toolbar-mark-button"
        :class="{'is-active':isFPerActive}"
    >
        清除样式
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