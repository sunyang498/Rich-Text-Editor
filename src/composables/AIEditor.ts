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
            const result=await callAI(selectedText,instruction)
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
        optimizeSelectedText
    }
}