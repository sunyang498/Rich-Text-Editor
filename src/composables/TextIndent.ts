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
            setTextIndent: (indent: string) => ({ chain, state }) => {
                const nodeType = state.selection.$head.parent.type.name
                return chain().updateAttributes(nodeType, { textIndent: indent }).run()
            },
            unsetTextIndent: () => ({ chain, state }) => {
                const nodeType = state.selection.$head.parent.type.name
                return chain().updateAttributes(nodeType, { textIndent: null }).run()
            },
            increaseIndent: () => ({ chain, state }) => {
                const node = state.selection.$head.parent
                const currentIndent = node.attrs.textIndent
                const currentValue = currentIndent ? parseFloat(currentIndent) : 0
                const newValue = currentValue + 2
                return chain().updateAttributes(node.type.name, { textIndent: `${newValue}em` }).run()
            },
            decreaseIndent: () => ({ chain, state }) => {
                const node = state.selection.$head.parent
                const currentIndent = node.attrs.textIndent
                const currentValue = currentIndent ? parseFloat(currentIndent) : 0
                const newValue = Math.max(0, currentValue - 2)
                return chain().updateAttributes(node.type.name, {
                    textIndent: newValue === 0 ? null : `${newValue}em`,
                }).run()
            },
        }
    },
})