import { Extension } from '@tiptap/core'

export interface TextIndentOptions {
    types: string[],
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textIndent: {
            setTextIndent: (indent: string) => ReturnType,
            unsetTextIndent: () => ReturnType,
            increaseIndent: () => ReturnType,
            decreaseIndent: () => ReturnType,
        }
    }
}

export const TextIndent = Extension.create<TextIndentOptions>({
    name: 'textIndent',
    addOptions() {
        return {
        types: ['paragraph', 'heading'],
        }
    },

    addGlobalAttributes() {
        return [
        {
            types: this.options.types,
            attributes: {
                textIndent: {
                    default: null,
                    parseHTML: element => element.style.textIndent?.replace(/['"]+/g, ''),
                    renderHTML: attributes => {
                        if (!attributes.textIndent) {
                            return {}
                        }
                        return {
                            style: `text-indent: ${attributes.textIndent}`,
                        }
                    },
                },
            },
        },
        ]
    },

    addCommands() {
        return {
            setTextIndent: (indent: string) => ({ chain }) => {
                return chain().setMark('textStyle', { textIndent: indent }).run()
            },
            unsetTextIndent: () => ({ chain }) => {
                return chain().setMark('textStyle', { textIndent: null }).removeEmptyTextStyle().run()
            },
            increaseIndent: () => ({ chain, state }) => {
                const currentIndent = state.selection.$head.marks().find(mark => mark.type.name === 'textStyle')?.attrs.textIndent
                const currentValue = currentIndent ? parseFloat(currentIndent) : 0
                const newValue = currentValue + 2
                
                return chain().setMark('textStyle', { textIndent: `${newValue}em` }).run()
            },
            decreaseIndent: () => ({ chain, state }) => {
                const currentIndent = state.selection.$head.marks().find(mark => mark.type.name === 'textStyle')?.attrs.textIndent
                const currentValue = currentIndent ? parseFloat(currentIndent) : 0
                const newValue = Math.max(0, currentValue - 2)
                if (newValue === 0) {
                    return chain().setMark('textStyle', { textIndent: null }).removeEmptyTextStyle().run()
                }
                return chain().setMark('textStyle', { textIndent: `${newValue}em` }).run()
            },
        }
    },
})