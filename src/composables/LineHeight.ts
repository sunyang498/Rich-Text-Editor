// import { Extension } from '@tiptap/core'

// export interface LineHeightOptions {
//     types: string[],
// }

// declare module '@tiptap/core' {
//     interface Commands<ReturnType> {
//         lineHeight: {
//             setLineHeight: (lineHeight: string) => ReturnType,
//             unsetLineHeight: () => ReturnType,
//         }
//     }
// }

// export const LineHeight = Extension.create<LineHeightOptions>({
//     name: 'lineHeight',
//     addOptions() {
//         return {
//             types: ['paragraph', 'heading'],
//         }
//     },
//     addGlobalAttributes() {
//         return [
//         {
//             types: this.options.types,
//             attributes: {
//                 lineHeight: {
//                     default: null,
//                     parseHTML: element => element.style.lineHeight?.replace(/['"]+/g, ''),
//                     renderHTML: attributes => {
//                         if (!attributes.lineHeight) {
//                             return {}
//                         }
//                         return {
//                             style: `line-height: ${attributes.lineHeight}`,
//                         }
//                     },
//                 },
//             },
//         },
//         ]
//     },
//     addCommands() {
//         return {
//             setLineHeight: (lineHeight: string) => ({ chain }) => {
//                 return chain().setMark('textStyle', { lineHeight }).run()
//             },
//             unsetLineHeight: () => ({ chain }) => {
//                 return chain().setMark('textStyle', { lineHeight: null }).run()
//             },
//         }
//     },
// })

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
            types: ['textStyle'], // 确保应用到 textStyle
        }
    },
    addGlobalAttributes() {
        return [
        {
            types: ['textStyle'], // 应用到文本样式标记
            attributes: {
                lineHeight: {
                    default: null,
                    parseHTML: element => {
                        // 尝试从 span 或父元素获取行高
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
                        // 确保样式应用到内联元素
                        return {
                            style: `line-height: ${attributes.lineHeight}`,
                        }
                    },
                },
            },
        },
        ]
    },

    addCommands() {
        return {
            setLineHeight: (lineHeight: string) => ({ chain, state }) => {
                console.log('设置行高:', lineHeight)
                // 确保有选中内容
                const { from, to } = state.selection
                const hasSelection = from !== to
                if (hasSelection) {
                // 有选中文本，应用文本标记
                return chain()
                    .setMark('textStyle', { lineHeight })
                    .run()
                } else {
                // 没有选中文本，尝试应用到整个块
                return chain()
                    .setMark('textStyle', { lineHeight })
                    .run()
                }
            },
            unsetLineHeight: () => ({ chain }) => {
                return chain()
                .setMark('textStyle', { lineHeight: null })
                .run()
            },
        }
    },
})