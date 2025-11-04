import axios from 'axios'
const ZHIPU_API_URL='https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY='18c4bf4b164e4cff96919627b6e16ff1.4T7VD0xztCPNaLE0'
export async function callAI(prompt:string):Promise<string> {
    try{
        const response=await axios.post(
            ZHIPU_API_URL,
            {
                model:'glm-4-flash',
                messages:[
                    {
                        role:'user',
                        content:prompt
                    }
                ],
                stream:false
            },
            {
                headers:{
                    'Authorization':`Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        return response.data.choices[0].message.content
    }catch(e){
        console.error('ERROR:',e)
        throw new Error('ai不可用')
    }
}