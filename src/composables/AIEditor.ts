import { callAI, callAIStream, type StreamController } from "@/apis/aiAPI";
import { ref, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'

export function useAIEditor() {
    // ========== 原有状态 ==========
    const isLoading = ref(false)
    const AIError = ref('')
    const AIResult = ref('')

    // ========== 流式新增状态 ==========
    const isStreaming = ref(false)
    const streamedText = ref('')
    let streamCtrl: StreamController | null = null

    // RAF 批量提交缓冲区（生成模式用）
    let pendingBuffer = ''
    let rafScheduled = false
    let flushEditor: Editor | null = null

    // AI 内容在编辑器中的起止位置（用于回滚）
    let aiStartPos: number | null = null
    let aiEndPos: number | null = null
    let insertCount = 0

    // ========== 非流式方法（保留向后兼容） ==========

    const optimizeSelectedText = async (selectedText: string, instruction: string) => {
        isLoading.value = true
        AIError.value = ''
        AIResult.value = ''
        try {
            const prompt = `请你根据以下要求优化文本：
                            要求：${instruction}
                            待优化文本：${selectedText}
                            直接返回优化后的文本，不要添加任何解释`
            const result = await callAI(prompt)
            AIResult.value = result
            return result
        } catch (e) {
            AIError.value = e instanceof Error ? e.message : '未知错误'
            return null
        } finally {
            isLoading.value = false
        }
    }

    const generateText = async (instruction: string) => {
        isLoading.value = true
        AIError.value = ''
        AIResult.value = ''
        try {
            const prompt = `请你根据以下要求生成文本：
                            要求：${instruction}
                            直接返回优化后的文本，不要添加任何解释`
            const result = await callAI(prompt)
            AIResult.value = result
            return result
        } catch (e) {
            AIError.value = e instanceof Error ? e.message : '未知错误'
            return null
        } finally {
            isLoading.value = false
        }
    }

    // ========== 流式方法（新增） ==========

    function flushBuffer() {
        if (!pendingBuffer || !flushEditor) return
        flushEditor.chain().focus().insertContent(pendingBuffer).run()
        aiEndPos = flushEditor.state.selection.from
        insertCount++
        pendingBuffer = ''
        rafScheduled = false
    }

    /** 流式优化模式：面板预览 */
    function startStreamOptimize(selectedText: string, instruction: string) {
        abortStream()
        isStreaming.value = true
        isLoading.value = true
        AIError.value = ''
        AIResult.value = ''
        streamedText.value = ''

        const prompt = `请你根据以下要求优化文本：
                        要求：${instruction}
                        待优化文本：${selectedText}
                        直接返回优化后的文本，不要添加任何解释`

        streamCtrl = callAIStream(prompt, {
            onToken: (token: string) => {
                streamedText.value += token
                AIResult.value = streamedText.value
            },
            onDone: (fullText: string) => {
                AIResult.value = fullText
                streamedText.value = fullText
                isStreaming.value = false
                isLoading.value = false
                streamCtrl = null
            },
            onError: (error: Error) => {
                AIError.value = error.message
                isStreaming.value = false
                isLoading.value = false
                streamCtrl = null
            },
        })
    }

    /** 流式生成模式：实时插入编辑器 */
    function startStreamGenerate(editor: Editor, instruction: string) {
        abortStream()
        isStreaming.value = true
        isLoading.value = true
        AIError.value = ''
        AIResult.value = ''
        streamedText.value = ''
        pendingBuffer = ''
        rafScheduled = false
        flushEditor = editor
        insertCount = 0

        aiStartPos = editor.state.selection.from
        aiEndPos = aiStartPos

        const prompt = `请你根据以下要求生成文本：
                        要求：${instruction}
                        直接返回生成的文本，不要添加任何解释`

        streamCtrl = callAIStream(prompt, {
            onToken: (token: string) => {
                streamedText.value += token
                AIResult.value = streamedText.value
                pendingBuffer += token

                if (!rafScheduled) {
                    rafScheduled = true
                    requestAnimationFrame(() => flushBuffer())
                }
            },
            onDone: (fullText: string) => {
                if (pendingBuffer) flushBuffer()
                AIResult.value = fullText
                streamedText.value = fullText
                isStreaming.value = false
                isLoading.value = false
                flushEditor = null
                streamCtrl = null
            },
            onError: (error: Error) => {
                if (pendingBuffer) flushBuffer()
                AIError.value = error.message
                isStreaming.value = false
                isLoading.value = false
                flushEditor = null
                streamCtrl = null
            },
        })
    }

    function stopStream() {
        if (streamCtrl) {
            streamCtrl.abort()
            streamCtrl = null
        }
        if (pendingBuffer && flushEditor) {
            flushBuffer()
        }
        isStreaming.value = false
        isLoading.value = false
        flushEditor = null
    }

    function abortStream() {
        if (streamCtrl) {
            streamCtrl.abort()
            streamCtrl = null
        }
        pendingBuffer = ''
        rafScheduled = false
    }

    /** 撤销 AI 生成：undo + 区间删除兜底 */
    function undoStream(editor: Editor | null) {
        abortStream()
        isStreaming.value = false
        isLoading.value = false

        if (!editor || aiStartPos === null || aiEndPos === null) {
            flushEditor = null
            return
        }

        let undoSuccess = true
        for (let i = 0; i < insertCount; i++) {
            if (editor.can().undo()) {
                editor.chain().undo().run()
            } else {
                undoSuccess = false
                break
            }
        }

        if (!undoSuccess && aiStartPos !== null && aiEndPos !== null && aiStartPos < aiEndPos) {
            try {
                editor.chain()
                    .setTextSelection({ from: aiStartPos, to: aiEndPos })
                    .deleteSelection()
                    .run()
            } catch { /* 静默 */ }
        }

        aiStartPos = null
        aiEndPos = null
        insertCount = 0
        streamedText.value = ''
        AIResult.value = ''
        flushEditor = null
    }

    onBeforeUnmount(() => {
        abortStream()
    })

    return {
        isLoading,
        AIError,
        AIResult,
        optimizeSelectedText,
        generateText,
        isStreaming,
        streamedText,
        startStreamOptimize,
        startStreamGenerate,
        stopStream,
        undoStream,
    }
}