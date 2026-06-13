import axios from 'axios'

/** 从 Vite 环境变量读取，需 VITE_ 前缀才能在客户端侧访问 */
const ZHIPU_API_URL = import.meta.env.VITE_ZHIPU_API_URL ?? 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY ?? ''

/** 非流式调用（保留向后兼容） */
export async function callAI(prompt: string): Promise<string> {
    try {
        const response = await axios.post(
            ZHIPU_API_URL,
            {
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false,
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            },
        )
        return response.data.choices[0].message.content
    }catch(e){
        console.error('ERROR:',e)
        throw new Error('ai不可用')
    }
}

// ============ 流式调用（新增） ============

/** 流式回调接口 */
export interface StreamCallbacks {
    /** 每收到一个 token 时触发 */
    onToken: (token: string) => void
    /** 流正常结束时触发 */
    onDone: (fullText: string) => void
    /** 流异常时触发 */
    onError: (error: Error) => void
}

/** 流式控制器 */
export interface StreamController {
    abort: () => void
    promise: Promise<string>
}

/**
 * 流式调用智谱 AI（SSE），通过回调逐 token 返回增量内容。
 *
 * 协议说明：
 * - 请求 body 中 stream: true
 * - 响应 Content-Type: text/event-stream
 * - 每行格式：data: {"choices":[{"delta":{"content":"xxx"}}]}
 * - 结束标记：data: [DONE]
 */
export function callAIStream(
    prompt: string,
    callbacks: StreamCallbacks,
): StreamController {
    const abortController = new AbortController()
    let fullText = ''

    const promise = (async (): Promise<string> => {
        try {
            const response = await fetch(ZHIPU_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                }),
                signal: abortController.signal,
            })

            if (!response.ok) {
                throw new Error(`AI API error: HTTP ${response.status}`)
            }

            const reader = response.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                // stream: true 避免多字节字符（中文）被截断
                buffer += decoder.decode(value, { stream: true })

                // SSE 消息以双换行分隔
                const messages = buffer.split('\n\n')
                buffer = messages.pop() || ''

                for (const msg of messages) {
                    for (const line of msg.split('\n')) {
                        if (!line.startsWith('data: ')) continue
                        const data = line.slice(6).trim()
                        if (data === '[DONE]') {
                            callbacks.onDone(fullText)
                            return fullText
                        }
                        try {
                            const parsed = JSON.parse(data)
                            const content = parsed.choices?.[0]?.delta?.content
                            if (content) {
                                fullText += content
                                callbacks.onToken(content)
                            }
                        } catch {
                            // 忽略 JSON 解析失败的行
                        }
                    }
                }
            }

            callbacks.onDone(fullText)
            return fullText
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                console.error('[AI Stream] error:', e)
                callbacks.onError(e instanceof Error ? e : new Error('AI 流式请求失败'))
            }
            return fullText
        }
    })()

    return {
        abort: () => abortController.abort(),
        promise,
    }
}