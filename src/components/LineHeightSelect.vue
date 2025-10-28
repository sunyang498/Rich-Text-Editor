<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

interface LineHeightOption {
    value: string
    label: string
}

const lineHeightOptions: LineHeightOption[] = [
    { value: '1', label: '单倍行高 (1.0)' },
    { value: '1.15', label: '1.15 倍行高' },
    { value: '1.5', label: '1.5 倍行高' },
    { value: '2', label: '双倍行高 (2.0)' },
    { value: '2.5', label: '2.5 倍行高' },
    { value: '3', label: '3 倍行高' },
]

const currentLineHeight = computed(() => {
    return editor.value?.getAttributes('textStyle')?.lineHeight || ''
})

const handleLineHeightChange = (event: Event) => {
    const lineHeight = (event.target as HTMLSelectElement).value
    console.log(lineHeight)
    if (lineHeight) {
        editor.value?.chain().focus().setLineHeight(lineHeight).run()
    } else {
        editor.value?.chain().focus().unsetLineHeight().run()
    }
}
</script>

<template>
    <select 
        :value="currentLineHeight" 
        @change="handleLineHeightChange"
        class="line-height-picker"
        title="行高"
    >
        <option value="">默认行高</option>
        <option 
            v-for="option in lineHeightOptions" 
            :key="option.value" 
            :value="option.value"
        >
            {{ option.label }}
        </option>
    </select>
</template>

<style scoped>
.line-height-picker {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-width: 120px;
  font-size: 14px;
}

.line-height-picker:focus {
  outline: none;
  border-color: #007bff;
}
</style>