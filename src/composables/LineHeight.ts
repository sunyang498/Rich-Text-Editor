import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        lineHeight: {
            setLineHeight: (lineHeight: string) => ReturnType,
            unsetLineHeight: () => ReturnType,
        }
    }
}

export const LineHeight = Extension.create({
    name: 'lineHeight',
    addOptions() {
        return {
            types: ['textStyle', 'paragraph', 'heading'],
        }
    },
    addGlobalAttributes() {
        return [
        {
            types: ['textStyle'],
            attributes: {
                lineHeight: {
                    default: null,
                    parseHTML: element => {
                        let lineHeight = element.style.lineHeight
                        if (!lineHeight && element.parentElement) {
                            lineHeight = element.parentElement.style.lineHeight
                        }
                        return lineHeight ? lineHeight.replace(/['"]+/g, '') : null
                    },
                    renderHTML: attributes => {
                        if (!attributes.lineHeight) {
                            return {}
                        }
                        return {
                            style: `line-height: ${attributes.lineHeight}`,
                        }
                    },
                },
            },
        },
        {
            types: ['paragraph', 'heading'],
            attributes: {
                lineHeight: {
                    default: null,
                    parseHTML: element => {
                        const lh = element.style.lineHeight
                        return lh ? lh.replace(/['"]+/g, '') : null
                    },
                    renderHTML: attributes => {
                        if (!attributes.lineHeight) return {}
                        return { style: `line-height: ${attributes.lineHeight}` }
                    },
                },
            },
        },
        ]
    },

    addCommands() {
        return {
            setLineHeight: (lineHeight: string) => ({ chain, state }) => {
                const { from, to } = state.selection
                if (from !== to) {
                    // 有选中文本：应用行内 textStyle mark
                    return chain()
                        .setMark('textStyle', { lineHeight })
                        .run()
                }
                // 无选中文本：应用到当前块级节点，避免 mark 悬空
                const nodeType = state.selection.$head.parent.type.name
                return chain()
                    .updateAttributes(nodeType, { lineHeight })
                    .run()
            },
            unsetLineHeight: () => ({ chain, state }) => {
                const { from, to } = state.selection
                if (from !== to) {
                    return chain()
                        .setMark('textStyle', { lineHeight: null })
                        .removeEmptyTextStyle()
                        .run()
                }
                const nodeType = state.selection.$head.parent.type.name
                return chain()
                    .updateAttributes(nodeType, { lineHeight: null })
                    .run()
            },
        }
    },
})