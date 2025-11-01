<script setup lang="ts">
import { useEditorContext } from '@/composables/EditorContext';
import { ref,computed, nextTick } from 'vue'

const editor=useEditorContext()
const showLinkDialog=ref(false)
const linkUrl=ref('')
const linkText=ref('')
const openInNewTab=ref(false)
const urlInput=ref<HTMLInputElement>()
const selectText=computed(()=>{
    const from = editor.value?.state.selection.from
    const to = editor.value?.state.selection.to
    if(from===to||!from||!to)
        return
    const linkText=editor.value?.state.doc.textBetween(from,to)
    return linkText
})
const isLinkActive=computed(()=>{
    return editor.value?.isActive('link')||false
})
const currentLinkAttributes=computed(()=>{
    return editor.value?.getAttributes('link')||{}
})
const toggleLinkDialog=async()=>{
    showLinkDialog.value=!showLinkDialog.value
    if(showLinkDialog.value){
        await initDialog()
        await nextTick()
        if(urlInput.value)
            urlInput.value.focus()
    }else{
        resetForm()
    }
}
const resetForm=()=>{
    linkText.value=''
    linkUrl.value=''
    openInNewTab.value=false
}
const initDialog=()=>{
    if(editor.value?.isActive('link')){
        const linkAtt=editor.value.getAttributes('link')
        linkUrl.value=linkAtt.href
        if(typeof(selectText.value)==='string')
            linkText.value=selectText.value
        openInNewTab.value=linkAtt.target==='_blank'
        editor.value.chain().focus().extendMarkRange('link').run()
    }else{
        linkUrl.value='https://'
        if(typeof(selectText.value)==='string'){
            linkText.value=selectText.value
        }
        openInNewTab.value=false
    }
}
const applyLink=()=>{
    const linkAtt={
        href:linkUrl.value,
        target:'_blank',
        rel:'noopener noreferrer nofollow'
    }
    if(openInNewTab.value){
        linkAtt.rel='noopener noreferrer nofollow'
        linkAtt.target='_blank'
    }
    if(isLinkActive.value){
        editor.value?.chain().focus().extendMarkRange('link').updateAttributes('link',linkAtt).run()
    
    }else if(selectText.value){
        editor.value?.chain().focus().setLink(linkAtt).run()
    }else{
        editor.value?.chain().focus().setLink(linkAtt).insertContent(linkUrl.value).run()
    }
    showLinkDialog.value=false
}
const removeLink=()=>{
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    showLinkDialog.value=false
}
const cancelLink=()=>{
    showLinkDialog.value=false
}
const selectedText=computed(()=>{
    return false
})
</script>

<template>
    <div class="link-controls">
        <!-- 链接按钮 -->
        <button
            @click="toggleLinkDialog"
            :class="['link-button', { 'is-active': isLinkActive }]"
            title="插入或编辑链接"
        >
        🔗
        </button>

        <!-- 链接对话框 -->
        <div v-if="showLinkDialog" class="link-dialog">
            <div class="dialog-content">
                <!-- URL输入 -->
                <div class="form-group">
                    <label>链接地址</label>
                    <input
                        ref="urlInput"
                        v-model="linkUrl"
                        type="url"
                        placeholder="https://example.com"
                        @keyup.enter="applyLink"
                    >
                </div>

                <!-- 链接文本输入（有选中文本时才显示） -->
                <div class="form-group" v-if="selectedText">
                    <label>链接文本</label>
                    <input
                        v-model="linkText"
                        type="text"
                        placeholder="显示文本"
                        @keyup.enter="applyLink"
                    >
                </div>

                <!-- 打开方式选项 -->
                <div class="form-group">
                    <label class="checkbox-label">
                        <input
                        v-model="openInNewTab"
                        type="checkbox"
                        >
                        在新窗口打开
                    </label>
                </div>

                <!-- 操作按钮 -->
                <div class="dialog-actions">
                    <button @click="applyLink" class="btn-primary">应用</button>
                    <button @click="removeLink" class="btn-danger" v-if="isLinkActive">移除</button>
                    <button @click="cancelLink" class="btn-secondary">取消</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.link-controls {
  position: relative;
  display: inline-block;
}

.link-button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.link-button:hover {
  background: #f5f5f5;
}

.link-button.is-active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.link-dialog {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 8px;
  min-width: 300px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>