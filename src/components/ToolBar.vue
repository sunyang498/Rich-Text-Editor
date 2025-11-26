<script setup lang="ts">
import MarkButton from './MarkButton.vue'
import { useEditorContext } from '@/composables/EditorContext'
import ColorPicker from './ColorPicker.vue'
import FontSizePicker from './FontSizePicker.vue'
import FontFamilyPicker from './FontFamilyPicker.vue'
import HeadingSelect from './HeadingSelect.vue'
import TextAlignSelect from './TextAlignSelect.vue'
import LineHeightSelect from './LineHeightSelect.vue'
import TextIndentSelect from './TextIndentSelect.vue'
import ListControl from './ListControl.vue'
import BlockElement from './BlockElement.vue'
import ImageControl from './ImageControl.vue'
import LinkControl from './LinkControl.vue'
import EditControl from './EditControl.vue'
import AI from '@/components/AI.vue'
import GrammarCheck from './GrammarCheck.vue'

// 获取编辑器实例
const editor = useEditorContext()

</script>

<template>
    <div class="toolbar">
        <div class="toolbar-left">
            <!-- 主要格式化按钮（可水平滚动） -->
            <div class="group">
                <MarkButton :command="() => editor?.chain().focus().toggleBold().run()" :is-active="editor?.isActive('bold')" label="粗体" />
                <MarkButton :command="() => editor?.chain().focus().toggleItalic().run()" :is-active="editor?.isActive('italic')" label="斜体" />
                <MarkButton :command="() => editor?.chain().focus().toggleUnderline().run()" :is-active="editor?.isActive('underline')" label="下划线" />
                <MarkButton :command="() => editor?.chain().focus().toggleStrike().run()" :is-active="editor?.isActive('strike')" label="删除线" />
                <MarkButton :command="() => editor?.chain().focus().toggleCode().run()" :is-active="editor?.isActive('code')" label="代码" />
            </div>

            <div class="group">
                <ColorPicker type="text" />
                <ColorPicker type="background" />
                <FontSizePicker />
                <FontFamilyPicker />
                <HeadingSelect />
                <TextAlignSelect />
                <LineHeightSelect />
                <TextIndentSelect />
                <ListControl />
                <BlockElement />
                <ImageControl />
                <LinkControl />
            </div>
        </div>

        <div class="toolbar-right">
            <EditControl />
            <AI />
            <GrammarCheck />
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(16,24,40,0.04);
    background: linear-gradient(180deg, #ffffff, #fbfbfb);
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    flex: 1 1 auto; /* 允许在父容器中伸缩 */
    min-width: 0; /* 避免在 flex 布局中溢出，触发子元素滚动 */
}

.toolbar-left { display:flex; gap:8px; align-items:center; overflow-x:auto; flex:1; -webkit-overflow-scrolling: touch }
.toolbar-left::-webkit-scrollbar{ height:8px }
.toolbar-left::-webkit-scrollbar-thumb{ background: rgba(16,24,40,0.08); border-radius:4px }
.toolbar-left .group { display:flex; gap:8px; align-items:center; white-space: nowrap }
.toolbar-left .group > * { display: inline-flex }
.toolbar-right { display:flex; gap:8px; align-items:center }

/* 手机端：工具栏固定于顶部，扩大交互目标并改善触摸滚动体验 */
@media (max-width: 600px) {
    .toolbar {
        position: sticky;
        top: 0;
        z-index: 12;
        padding: 8px 10px;
        background: linear-gradient(180deg,#ffffff,#fbfbff);
    }
    .toolbar-left { gap:10px }
    .toolbar-left .group { gap:10px }
    .toolbar ::v-deep .toolbar-mark-button,
    .toolbar ::v-deep button { padding: 10px 14px; font-size: 15px }
}

/* 给工具栏内元素更一致的小尺寸样式 */
.toolbar ::v-deep .toolbar-mark-button,
.toolbar ::v-deep .image-button,
.toolbar ::v-deep button {
    padding: 6px 10px;
    font-size: 13px;
}

/* 手机端：工具栏可换行，按钮自适应 */
@media (max-width: 600px) {
    .toolbar { flex-wrap: wrap; gap: 6px; padding: 8px; }
    .toolbar ::v-deep .toolbar-mark-button { padding: 8px 10px; font-size: 14px }
}
</style>