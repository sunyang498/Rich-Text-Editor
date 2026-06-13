<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useAIEditor } from '@/composables/AIEditor'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()
const {
    isLoading, AIError, AIResult,
    isStreaming, streamedText,
    optimizeSelectedText, generateText,
    startStreamOptimize, startStreamGenerate,
    stopStream, undoStream,
} = useAIEditor()

const instruction = ref('')
const isVisible = ref(false)
const originSeleT = ref({ from: 0, to: 0 })
type AIMode = 'optimize' | 'generate'
const currentMode = ref<AIMode>('generate')
const presetCommands = [
    { label: '更正式', prompt: '让文本更加正式和专业' },
    { label: '更简洁', prompt: '简化文本使其更加简洁明了' },
    { label: '扩写', prompt: '扩展文本内容，使其更加详细丰富' },
    { label: '润色', prompt: '对文本进行润色，提升语言表达质量' },
    { label: '口语化', prompt: '将文本改为更口语化的表达' },
]

// ====== 对话框拖拽 ======
const panelPos = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const panelStyle = computed(() => {
    if (panelPos.value.x === 0 && panelPos.value.y === 0) {
        return {} // 首次使用 CSS 默认居中
    }
    return {
        top: panelPos.value.y + 'px',
        left: panelPos.value.x + 'px',
        transform: 'none',
    }
})

function onPanelDragStart(e: MouseEvent) {
    const panel = (e.currentTarget as HTMLElement).closest('.ai-simple-panel') as HTMLElement
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    // 首次拖拽时从 CSS 居中位置捕获实际坐标
    if (panelPos.value.x === 0 && panelPos.value.y === 0) {
        panelPos.value = { x: rect.left, y: rect.top }
    }
    dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    isDragging.value = true
    document.addEventListener('mousemove', onPanelDragMove)
    document.addEventListener('mouseup', onPanelDragEnd)
}

function onPanelDragMove(e: MouseEvent) {
    if (!isDragging.value) return
    panelPos.value = {
        x: e.clientX - dragOffset.value.x,
        y: e.clientY - dragOffset.value.y,
    }
}

function onPanelDragEnd() {
    isDragging.value = false
    document.removeEventListener('mousemove', onPanelDragMove)
    document.removeEventListener('mouseup', onPanelDragEnd)
}

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onPanelDragMove)
    document.removeEventListener('mouseup', onPanelDragEnd)
})

// ====== 业务逻辑 ======

const selectedText = computed(() => {
    if (!editor.value) return ''
    const { from, to } = editor.value.state.selection
    return from === to ? '' : editor.value.state.doc.textBetween(from, to)
})

const openAI = () => {
    if (editor.value) {
        const { from, to } = editor.value.state.selection
        originSeleT.value = { from, to }
    }
    isVisible.value = true
    AIResult.value = ''
    AIError.value = ''
}

const closeAI = () => {
    if (isStreaming.value) {
        stopStream()
    }
    isVisible.value = false
}

/** 执行 AI 操作 */
const handleOptimize = async () => {
    if (!instruction.value.trim() || isLoading.value) return

    if (currentMode.value === 'optimize') {
        startStreamOptimize(selectedText.value, instruction.value)
    } else {
        if (!editor.value) return
        startStreamGenerate(editor.value, instruction.value)
    }
}

const handleStop = () => {
    stopStream()
}

const handleUndo = () => {
    undoStream(editor.value ?? null)
}

const handleApply = () => {
    if (!editor.value) return
    const { from, to } = originSeleT.value
    editor.value.chain().focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent(AIResult.value)
        .run()
    closeAI()
}

</script>

<template>
    <div class="ai-toolbar-group">
        <button @click="openAI" class="ai-trigger-btn" :class="{ active: isVisible }">
            🤖 AI
        </button>
        <div class="mode-switcher-inline">
            <button
                @click="currentMode='optimize'"
                :class="{ active: currentMode === 'optimize' }"
                class="mode-btn-sm"
            >优化</button>
            <button
                @click="currentMode='generate'"
                :class="{ active: currentMode === 'generate' }"
                class="mode-btn-sm"
            >生成</button>
        </div>
    </div>

    <!-- ====== 优化模式面板 ====== -->
    <div class="ai-simple-panel" v-if="isVisible && currentMode === 'optimize'" :style="panelStyle">
        <div class="panel-header" @mousedown="onPanelDragStart">
            <h3>🤖 AI 文本优化</h3>
            <button class="close-btn" @click="closeAI">×</button>
        </div>

        <div class="panel-content">
            <div class="selected-text-preview" v-if="selectedText">
                <label>选中的文本：</label>
                <div class="text-preview">{{ selectedText }}</div>
            </div>
            <div class="preset-row">
                <button
                    v-for="preset in presetCommands"
                    :key="preset.label"
                    @click="instruction = preset.prompt"
                    class="preset-btn"
                >{{ preset.label }}</button>
            </div>
            <div class="instruction-input">
                <label>优化指令：</label>
                <input
                    v-model="instruction"
                    placeholder="例如：让文本更简洁、更正式、扩写等..."
                    @keyup.enter="handleOptimize"
                    :disabled="isStreaming"
                />
            </div>

            <div class="action-buttons">
                <button
                    v-if="!isStreaming"
                    @click="handleOptimize"
                    :disabled="!instruction.trim() || isLoading"
                    class="optimize-btn"
                >{{ isLoading ? '优化中...' : '开始优化' }}</button>
                <button
                    v-if="isStreaming"
                    @click="handleStop"
                    class="stop-btn"
                >⏹ 停止生成</button>
                <button @click="closeAI" class="cancel-btn">取消</button>
            </div>

            <div v-if="isStreaming || AIResult" class="result-section">
                <label>
                    {{ isStreaming ? '⌛ 生成中...' : '✅ 优化结果：' }}
                    <span v-if="isStreaming" class="streaming-badge">流式</span>
                </label>
                <div class="result-text" :class="{ streaming: isStreaming }">
                    {{ isStreaming ? streamedText : AIResult }}
                    <span v-if="isStreaming" class="cursor-blink">|</span>
                </div>
                <button
                    v-if="!isStreaming && AIResult"
                    @click="handleApply"
                    class="apply-btn"
                >应用结果</button>
            </div>

            <div v-if="AIError" class="error-message">❌ {{ AIError }}</div>
        </div>
    </div>

    <!-- ====== 生成模式面板 ====== -->
    <div class="ai-simple-panel" v-if="isVisible && currentMode === 'generate'" :style="panelStyle">
        <div class="panel-header" @mousedown="onPanelDragStart">
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
                    :disabled="isStreaming"
                />
            </div>

            <div class="action-buttons">
                <button
                    v-if="!isStreaming"
                    @click="handleOptimize"
                    :disabled="!instruction.trim() || isLoading"
                    class="optimize-btn"
                >{{ isLoading ? '生成中...' : '🚀 开始生成' }}</button>
                <button
                    v-if="isStreaming"
                    @click="handleStop"
                    class="stop-btn"
                >⏹ 停止生成</button>
                <button
                    v-if="isStreaming"
                    @click="handleUndo"
                    class="undo-btn"
                >↩ 撤销</button>
                <button v-if="!isStreaming" @click="closeAI" class="cancel-btn">关闭</button>
            </div>

            <div v-if="isStreaming" class="streaming-status">
                <span class="pulse-dot"></span>
                内容正在实时写入编辑器... 已生成 {{ streamedText.length }} 字
            </div>

            <div v-if="!isStreaming && AIResult" class="result-section">
                <label>✅ 生成完成（共 {{ AIResult.length }} 字）</label>
                <div class="result-text">{{ AIResult.slice(0, 200) }}{{ AIResult.length > 200 ? '...' : '' }}</div>
            </div>

            <div v-if="AIError" class="error-message">❌ {{ AIError }}</div>
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
  cursor: grab;
  user-select: none;
}
.panel-header:active { cursor: grabbing; }

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

/* ====== 新增：流式输出样式 ====== */

/* 工具栏 AI 按钮组 */
.ai-toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-trigger-btn {
  padding: 6px 12px;
  border: 1px solid rgba(16,24,40,0.12);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s ease;
}
.ai-trigger-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.ai-trigger-btn.active { box-shadow: 0 0 0 2px rgba(102,126,234,0.4); }

.mode-switcher-inline {
  display: flex;
  gap: 2px;
  background: rgba(16,24,40,0.04);
  border-radius: 6px;
  padding: 2px;
}

.mode-btn-sm {
  padding: 4px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.12s ease;
}
.mode-btn-sm.active {
  background: white;
  color: #667eea;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* 预设按钮行 */
.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.preset-btn {
  padding: 4px 10px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  transition: all 0.12s ease;
}
.preset-btn:hover { background: #f0f0ff; border-color: #667eea; color: #667eea; }

/* 停止按钮 */
.stop-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #ff4d4f;
  color: white;
  font-weight: 500;
}
.stop-btn:hover { background: #ff7875; }

/* 撤销按钮 */
.undo-btn {
  padding: 8px 16px;
  border: 1px solid #ffa39e;
  border-radius: 4px;
  cursor: pointer;
  background: #fff2f0;
  color: #ff4d4f;
  font-weight: 500;
}
.undo-btn:hover { background: #ffe7e7; }

/* 流式徽章 */
.streaming-badge {
  display: inline-block;
  padding: 1px 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  animation: badgePulse 1.5s ease-in-out infinite;
}

/* 流式文本 + 闪烁光标 */
.result-text.streaming {
  background: #fafbff;
  border-color: #d6e4ff;
}

.cursor-blink {
  display: inline;
  font-weight: 100;
  color: #667eea;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 流式状态栏 */
.streaming-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 6px;
  font-size: 13px;
  color: #3b5998;
}

.pulse-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #667eea;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}

.result-text {
  max-height: 260px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
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