import axios from 'axios'

/** 从 Vite 环境变量读取，需 VITE_ 前缀才能在客户端侧访问 */
const ZHIPU_API_URL = import.meta.env.VITE_ZHIPU_API_URL ?? 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY ?? ''

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