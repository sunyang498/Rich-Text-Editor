<script setup lang="ts">
import { useEditorContext } from '@/composables/EditorContext';
import { computed } from 'vue'

const editor=useEditorContext()
type HeadingLevel = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const currentHeading = computed<HeadingLevel>(() => {
    if (editor.value?.isActive('heading', { level: 1 })) return 'h1'
    if (editor.value?.isActive('heading', { level: 2 })) return 'h2'
    if (editor.value?.isActive('heading', { level: 3 })) return 'h3'
    if (editor.value?.isActive('heading', { level: 4 })) return 'h4'
    if (editor.value?.isActive('heading', { level: 5 })) return 'h5'
    if (editor.value?.isActive('heading', { level: 6 })) return 'h6'
    return 'paragraph'
})

// 获取提示文本
const getTitleText = computed(() => {
    const texts = {
        paragraph: '正文 - 普通段落文本',
        h1: '标题 1 - 文档主标题',
        h2: '标题 2 - 主要章节',
        h3: '标题 3 - 子章节',
        h4: '标题 4 - 小标题',
        h5: '标题 5 - 次级标题',
        h6: '标题 6 - 最小标题'
    }
    return texts[currentHeading.value]
})

// 获取预览文本
const getPreviewText = computed(() => {
  const texts = {
    paragraph: '正文',
    h1: 'H1',
    h2: 'H2', 
    h3: 'H3',
    h4: 'H4',
    h5: 'H5',
    h6: 'H6'
  }
  return texts[currentHeading.value]
})

const handleHeading = (event: Event) => {
    const target = event.target as HTMLSelectElement
    const headingType = target.value as HeadingLevel

    // 确保编辑器获得焦点
    editor.value?.chain().focus()

    switch (headingType) {
        case 'paragraph':
            editor.value?.chain().setParagraph().run()
            break
        case 'h1':
            editor.value?.chain().toggleHeading({ level: 1 }).run()
            break
        case 'h2':
            editor.value?.chain().toggleHeading({ level: 2 }).run()
            break
        case 'h3':
            editor.value?.chain().toggleHeading({ level: 3 }).run()
            break
        case 'h4':
            editor.value?.chain().toggleHeading({ level: 4 }).run()
            break
        case 'h5':
            editor.value?.chain().toggleHeading({ level: 5 }).run()
            break
        case 'h6':
            editor.value?.chain().toggleHeading({ level: 6 }).run()
            break
    }
}
</script>

<template>
    <div>
        <select @change="handleHeading" :title="getTitleText" :value="currentHeading">
            <option value="h1">标题1</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
            <option value="h4">标题4</option>
            <option value="h5">标题5</option>
            <option value="h6">标题6</option>
        </select>
    </div>
</template>

<style scoped>

</style>


<!-- <template>
  <div class="heading-selector">
    <select 
      :value="currentHeading" 
      @change="handleHeadingChange"
      class="heading-dropdown"
      :title="getTitleText"
    >
      <option value="paragraph">正文</option>
      <option value="h1">标题 1</option>
      <option value="h2">标题 2</option>
      <option value="h3">标题 3</option>
      <option value="h4">标题 4</option>
      <option value="h5">标题 5</option>
      <option value="h6">标题 6</option>
    </select>
    

    <div class="heading-preview" :class="currentHeading">
      {{ getPreviewText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '../EditorContext'

const editor = useEditorContext()

// 定义标题级别类型
type HeadingLevel = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

// 计算当前标题级别
const currentHeading = computed<HeadingLevel>(() => {
  if (editor.value?.isActive('heading', { level: 1 })) return 'h1'
  if (editor.value?.isActive('heading', { level: 2 })) return 'h2'
  if (editor.value?.isActive('heading', { level: 3 })) return 'h3'
  if (editor.value?.isActive('heading', { level: 4 })) return 'h4'
  if (editor.value?.isActive('heading', { level: 5 })) return 'h5'
  if (editor.value?.isActive('heading', { level: 6 })) return 'h6'
  return 'paragraph'
})

// 获取提示文本
const getTitleText = computed(() => {
  const texts = {
    paragraph: '正文 - 普通段落文本',
    h1: '标题 1 - 文档主标题',
    h2: '标题 2 - 主要章节',
    h3: '标题 3 - 子章节',
    h4: '标题 4 - 小标题',
    h5: '标题 5 - 次级标题',
    h6: '标题 6 - 最小标题'
  }
  return texts[currentHeading.value]
})

// 获取预览文本
const getPreviewText = computed(() => {
  const texts = {
    paragraph: '正文',
    h1: 'H1',
    h2: 'H2', 
    h3: 'H3',
    h4: 'H4',
    h5: 'H5',
    h6: 'H6'
  }
  return texts[currentHeading.value]
})

// 处理标题变化
const handleHeadingChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const headingType = target.value as HeadingLevel
  
  // 确保编辑器获得焦点
  editor.value?.chain().focus()
  
  switch (headingType) {
    case 'paragraph':
      editor.value?.chain().setParagraph().run()
      break
    case 'h1':
      editor.value?.chain().toggleHeading({ level: 1 }).run()
      break
    case 'h2':
      editor.value?.chain().toggleHeading({ level: 2 }).run()
      break
    case 'h3':
      editor.value?.chain().toggleHeading({ level: 3 }).run()
      break
    case 'h4':
      editor.value?.chain().toggleHeading({ level: 4 }).run()
      break
    case 'h5':
      editor.value?.chain().toggleHeading({ level: 5 }).run()
      break
    case 'h6':
      editor.value?.chain().toggleHeading({ level: 6 }).run()
      break
  }
}
</script>

<style scoped>
.heading-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.heading-dropdown {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-width: 100px;
  font-size: 14px;
}

.heading-dropdown:focus {
  outline: none;
  border-color: #007bff;
}

.heading-preview {
  padding: 2px 6px;
  border-radius: 3px;
  background: #f5f5f5;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  min-width: 24px;
  text-align: center;
}

/* 不同标题级别的预览样式 */
.heading-preview.h1 {
  background: #e3f2fd;
  color: #1976d2;
}

.heading-preview.h2 {
  background: #f3e5f5;
  color: #7b1fa2;
}

.heading-preview.h3 {
  background: #e8f5e8;
  color: #388e3c;
}

.heading-preview.paragraph {
  background: #f5f5f5;
  color: #757575;
}
</style> -->