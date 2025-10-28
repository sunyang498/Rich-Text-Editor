<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext';
import TextAlign from '@tiptap/extension-text-align';

const editor=useEditorContext()
type AlignLevel='left'|'center'|'right'|'justify'
interface alignOp{
    value:AlignLevel,
    label:string
}
const alignList:alignOp[]=[
    {value:'left',label:'left'},
    {value:'center',label:'center'},
    {value:'right',label:'right'},
    {value:'justify',label:'justify'}
]

const currentAlign=computed<AlignLevel>(()=>{
    if(editor.value?.isActive({textAlign:'left'}))
        return 'left'
    if(editor.value?.isActive({textAlign:'center'})){
        console.log('center')
        return 'center'
        
    }
        
    if(editor.value?.isActive({textAlign:'right'}))
        return 'right'
    if(editor.value?.isActive({textAlign:'justify'}))
        return 'justify'
    return 'left'
})
const handleAlign=(align:string)=>{
    editor.value?.chain().focus().setTextAlign(align).run()
}


</script>

<template>
    <button v-for="items in alignList" 
        :key="items.value" :title="items.label" @click="handleAlign(items.value)" :class="[{'isactive':items.value===currentAlign}]">
        {{ items.label }}
    </button>

</template>

<style>
.isactive{
    color: #66ccff;
}

</style>