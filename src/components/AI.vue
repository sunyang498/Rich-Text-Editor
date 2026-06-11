<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAIEditor } from '@/composables/AIEditor'
import { useEditorContext } from '@/composables/EditorContext'

const editor=useEditorContext()
const { isLoading,AIError,AIResult,optimizeSelectedText,generateText }=useAIEditor()
const instruction=ref('')
const isVisible=ref(false)
const originSeleT=ref({from:0,to:0})
type AIMode='optimize'|'generate'
const currentMode=ref<AIMode>('optimize')
const presetCommands=[
    {label:'更正式',prompt:'让文本更加正式和专业'},
    {label:'更简洁',prompt:'简化文本使其更加简洁明了'},
    {label:'扩写',prompt:'扩展文本内容，使其更加详细丰富'},
    {label:'润色',prompt:'对文本进行润色，提升语言表达质量'},
    {label:'口语化',prompt:'将文本改为更口语化的表达'},
]

const selectedText=computed(()=>{
    if(!editor.value)
        return ''
    const {from,to}=editor.value.state.selection
    return from===to?'':editor.value.state.doc.textBetween(from,to)
})

const openAI=()=>{
    // 在打开面板时保存当前选区位置，避免 computed 副作用
    if (editor.value) {
        const { from, to } = editor.value.state.selection
        originSeleT.value = { from, to }
    }
    isVisible.value=true
}
const closeAI=()=>{
    isVisible.value=false
}
const handleOptimize = async () => {
    if (!instruction.value.trim()) 
        return
    if(currentMode.value==='optimize'){
        const result = await optimizeSelectedText(selectedText.value, instruction.value)
        if (result) {
            // 结果已经在 aiResult 中，UI 会自动更新
        }
    }else{
        const result=await generateText(instruction.value)
        if(result){

        }
    }
}
const handleApply=()=>{
    if(!editor.value)
        return
    const {from,to}=originSeleT.value
    editor.value.chain().focus().setTextSelection({from,to}).deleteSelection().insertContent(AIResult.value).run()
    closeAI()
}

</script>

<template>
    <div>
        <button
            @click="openAI"
            class="optimize-btn"
        >
            ai
        </button>
        <div>
            <button @click="currentMode='optimize'" :class="{'active':currentMode==='optimize'}" class="mode-btn">
                优化文本
            </button>
            <button @click="currentMode='generate'" :class="{'active':currentMode==='generate'}" class="mode-btn">
                生成文本
            </button>
        </div>
    </div>
    <div class="ai-simple-panel" v-if="isVisible&&currentMode==='optimize'">
        <div class="panel-header">
            <h3>🤖 AI 文本优化</h3>
            <button class="close-btn" @click="closeAI">×</button>
        </div>
        
        <div class="panel-content">
            <div class="selected-text-preview">
                <label>选中的文本：</label>
                <div class="text-preview">
                    {{ selectedText }}
                </div>
            </div>
            <div>
                <button v-for="preset in presetCommands" :key="preset.label" @click="instruction=preset.prompt" class="preset-btn">
                    {{ preset.label }}
                </button>
            </div>
            <div class="instruction-input">
                <label>优化指令：</label>
                <input 
                    v-model="instruction"
                    placeholder="例如：让文本更简洁、更正式、扩写等..."
                    @keyup.enter="handleOptimize"
                />
            </div>

            <div class="action-buttons">
                <button 
                    @click="handleOptimize"
                    :disabled="!instruction.trim() || isLoading"
                    class="optimize-btn"
                >
                    {{ isLoading ? '优化中...' : '开始优化' }}
                </button>
                <button @click="closeAI" class="cancel-btn">
                    取消
                </button>
            </div>

            <div v-if="AIResult" class="result-section">
                <label>优化结果：</label>
                <div class="result-text">
                    {{ AIResult }}
                </div>
                <button @click="handleApply" class="apply-btn">
                    应用结果
                </button>
            </div>

            <div v-if="AIError" class="error-message">
                ❌ {{ AIError }}
            </div>
        </div>
    </div>
    <div class="ai-simple-panel" v-if="isVisible&&currentMode==='generate'">
        <div class="panel-header">
            <h3>🤖 AI 文本生成</h3>
            <button class="close-btn" @click="closeAI">×</button>
        </div>
        
        <div class="panel-content">
            <div class="instruction-input">
                <label>生成指令：</label>
                <input 
                    v-model="instruction"
                    placeholder="例如：生成一段演讲稿等..."
                    @keyup.enter="handleOptimize"
                />
            </div>

            <div class="action-buttons">
                <button 
                    @click="handleOptimize"
                    :disabled="!instruction.trim() || isLoading"
                    class="optimize-btn"
                >
                    {{ isLoading ? '生成中...' : '开始生成' }}
                </button>
                <button @click="closeAI" class="cancel-btn">
                    取消
                </button>
            </div>

            <div v-if="AIResult" class="result-section">
                <label>生成结果：</label>
                <div class="result-text">
                    {{ AIResult }}
                </div>
                <button @click="handleApply" class="apply-btn">
                    应用结果
                </button>
            </div>

            <div v-if="AIError" class="error-message">
                ❌ {{ AIError }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.ai-simple-panel {
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

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}

.selected-text-preview,
.instruction-input,
.result-section {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.text-preview {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  max-height: 80px;
  overflow-y: auto;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.optimize-btn,
.cancel-btn,
.apply-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.optimize-btn {
  background: #1890ff;
  color: white;
}

.optimize-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
}

.apply-btn {
  background: #52c41a;
  color: white;
}

.result-text {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
}

.error-message {
  color: #ff4d4f;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}
.mode-switcher {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.mode-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.mode-btn.active {
  border-bottom-color: #1890ff;
  color: #1890ff;
  font-weight: 500;
}

.mode-btn:hover:not(.active) {
  background: #f5f5f5;
}

.length-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
}

.generate-mode .section {
  margin-bottom: 20px;
}
</style>