import { inject,provide,type Ref } from "vue";
import { Editor } from "@tiptap/vue-3";

const EditorSym=Symbol('editor')

export const provideEditor=(editor:Ref<Editor|undefined>)=>{
    provide(EditorSym, editor)
}

export const useEditorContext=()=>{
    const editor=inject<Ref<Editor|undefined>>(EditorSym)
    if(!editor){
        throw new Error("Editor context not provided")
    }
    return editor
}