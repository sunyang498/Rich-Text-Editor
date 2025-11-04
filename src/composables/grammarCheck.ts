import { callAI } from "@/apis/aiAPI";

export interface GrammarIssue{
    type: 'spelling'|'grammar'|'style'|'punctuation'
    position:{
        start:number,
        end:number
    }
    original:string
    suggestion:string
    reason:string
    severity:'low'|'medium'|'high'
}
export interface GrammarCheckResult{
    issues:GrammarIssue[]
    score:number
}
export class GrammarCheckService{
    private static clearAIResponse(text:string):string{
        const match=text.match(/^```json\s*([\s\S]*?)\s*```$/)
        if(match&&typeof match[1]==='string')
            return match[1]
        return ''
    }
    private static parseAIResponse(result:string):GrammarIssue[]{
        try{
            const parsed=JSON.parse(this.clearAIResponse(result))
            return parsed.issues
        }catch(e){
            console.log(e)
            return []
        }
    }
    static async checkText(text:string):Promise<GrammarIssue[]>{
        const prompt=`请检查以下文本的语法、拼写和表达问题，用JSON格式返回：
                        文本：${text}
                        返回格式：
                        {
                            "issues":[
                                {
                                    "type":"'spelling'|'grammar'|'style'",
                                    "position":{"start":0,"end":0},
                                    "original":"错误文本",
                                    "suggestion":"建议修正",
                                    "reason":"错误原因"
                                }
                            ]
                        }`
        const result=await callAI(prompt)
        return this.parseAIResponse(result)
    }
}