import { callAI } from "@/apis/aiAPI";
import { ref } from 'vue'

export function useAIEditor(){
    const isLoading=ref(false)
    const AIError=ref('')
    const AIResult=ref('')

    const optimizeSelectedText=async(selectedText:string,instruction:string)=>{
        isLoading.value=true
        AIError.value=''
        AIResult.value=''
        try{
            const prompt=`请你根据以下要求优化文本：
                            要求：${instruction}
                            待优化文本：${selectedText}
                            直接返回优化后的文本，不要添加任何解释`
            const result=await callAI(prompt)
            AIResult.value=result
            return result
        }catch(e){
            AIError.value=e instanceof Error?e.message:'未知错误'
            return null
        }finally{
            isLoading.value=false
        }
    }
    const generateText=async(instruction:string)=>{
        isLoading.value=true
        AIError.value=''
        AIResult.value=''
        try{
            const prompt=`请你根据以下要求生成文本：
                            要求：${instruction}
                            直接返回优化后的文本，不要添加任何解释`
            const result=await callAI(prompt)
            AIResult.value=result
            return result
        }catch(e){
            AIError.value=e instanceof Error?e.message:'未知错误'
            return null
        }finally{
            isLoading.value=false
        }
    }
    return{
        isLoading,
        AIError,
        AIResult,
        optimizeSelectedText,
        generateText
    }
}