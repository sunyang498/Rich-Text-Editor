<script setup lang="ts">
import { GrammarCheckService } from '@/composables/grammarCheck';
import type { GrammarIssue } from '@/composables/grammarCheck';
import { computed,ref } from 'vue';
import { useEditorContext } from '@/composables/EditorContext';

const editor=useEditorContext()
const originSeleT=ref({from:0,to:0})
const isGrammarCheckActive=ref(false)
const issues=ref<GrammarIssue[]>([])

const selectedText=computed(()=>{
    if(!editor.value)
        return ''
    const {from,to}=editor.value.state.selection
    originSeleT.value={from,to}
    return from===to?'':editor.value.state.doc.textBetween(from,to)
})

const toggleGrammarCheck=async()=>{
    issues.value=await GrammarCheckService.checkText(selectedText.value)
    isGrammarCheckActive.value=true
}

const fixAllIssues=()=>{

}

const applyFix=(issue:GrammarIssue)=>{

}

</script>

<template>
    
    <div>
        <button 
            @click="toggleGrammarCheck"
            :class="{ 'active': isGrammarCheckActive }"
            class="grammar-check-btn"
        >
            <span class="icon">🔍</span>
            语法检查
            <span v-if="issues.length" class="issue-count">{{ issues.length }}</span>
        </button>
    </div>

    <!-- 语法问题面板 -->
    <div v-if="isGrammarCheckActive && issues.length" class="grammar-panel">
        <div class="panel-header">
            <h4>发现 {{ issues.length }} 个问题</h4>
            <button @click="fixAllIssues" class="fix-all-btn">
                一键修正
            </button>
        </div>
        <div class="issues-list">
            <div 
                v-for="(issue, index) in issues" 
                :key="index"
                class="issue-item"
                @click="applyFix(issue)"
            >
                <div class="issue-type" :class="issue.type">
                    {{ issue.type }}
                </div>
                <div class="issue-text">
                    "{{ issue.original }}" → "{{ issue.suggestion }}"
                </div>
                <div class="issue-reason">
                    {{ issue.reason }}
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.grammar-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 400px;
  max-width: 600px;
}
</style>