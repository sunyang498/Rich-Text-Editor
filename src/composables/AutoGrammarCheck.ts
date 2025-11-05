import { ref,watch,onUnmounted } from 'vue'
import { GrammarCheckService } from './grammarCheck'
import { Underline } from '@tiptap/extension-underline'
type DebounceTimer=ReturnType<typeof setTimeout>

export function useAutoCheck(editor:any,grammarIssues:any){
    const isAutoChecking=ref(false)
    const autoCheckEnable=ref(true)
    let debounceTimer:DebounceTimer|null=null
    const debounceCheck=()=>{
        if(debounceTimer){
            clearTimeout(debounceTimer)
        }
        debounceTimer=setTimeout(async()=>{
            await performAutoCheck()
        },1500)
    }

    const performAutoCheck=async()=>{
        if(!editor.value||!autoCheckEnable.value||isAutoChecking.value)
            return
        const content=editor.value.getText()
        if(content.length<5){
            grammarIssues.value=[]
            return
        }
        const trimmedContent=content.trim()
        if(trimmedContent.length===0){
            grammarIssues.value=[]
            return
        }
        isAutoChecking.value=true
        try{
            console.log('checking')
            const issues=await GrammarCheckService.checkText(content)
            grammarIssues.value=issues
            issues.forEach((issue,index)=>{
                const {position:{start,end},suggestion,type}=issue
                editor.value?.chain().setTextSelection({from:start,to:end}).focus().setUnderline().run()
            })
            console.log(issues)
            console.log('over')
        }catch(e){
            console.error(e)
        }finally{
            isAutoChecking.value=false
        }
    }

    const setupAutoCheck=()=>{
        if(!editor.value){
            console.log('editor error')
            return
        }
        console.log('watching...')
        editor.value.on('update',({transaction}:any)=>{
            if(transaction.docChanged){
                debounceCheck()
            }
        })
    }

    const checkNow=()=>{
        if(debounceTimer){
            clearTimeout(debounceTimer)
        }
        performAutoCheck()
    }

    const cleanup=()=>{
        if(debounceTimer)
            clearTimeout(debounceTimer)
    }

    const toggleAutoCheck=()=>{
        autoCheckEnable.value=!autoCheckEnable.value
        if(!autoCheckEnable.value){
            grammarIssues.value=[]
            if(debounceTimer){
                clearTimeout(debounceTimer)
            }
        }
        console.log(`${autoCheckEnable.value?'open':'close'}`)
    }

    onUnmounted(cleanup)

    return{
        isAutoChecking,
        autoCheckEnable,
        setupAutoCheck,
        toggleAutoCheck,
        performAutoCheck,
        checkNow
    }
}