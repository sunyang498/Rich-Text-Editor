<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

const fontFamilyOptions = [
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, Times, serif', label: 'Times New Roman' },
    { value: 'Courier New, Courier, monospace', label: 'Courier New' },
    { value: 'SimSun, serif', label: '宋体' },
    { value: 'SimHei, sans-serif', label: '黑体' },
    { value: 'Microsoft YaHei, sans-serif', label: '微软雅黑' },
]

const currentFamily = computed(() => {
    return editor.value?.getAttributes('textStyle')?.fontFamily || ''
})

const setFontFamily = (event: Event) => {
    const size = (event.target as HTMLSelectElement).value
    if (size) {
        editor.value?.chain().focus().setFontFamily(size).run()
    } else {
        editor.value?.chain().focus().unsetFontFamily().run()
    }
}
</script>

<template>
    <select 
        :value="currentFamily" 
        @change="setFontFamily"
        class="font-size-picker"
    >
        <option value="">默认</option>
        <option 
            v-for="family in fontFamilyOptions" 
            :key="family.value" 
            :value="family.value"
        >
            {{ family.label }}
        </option>
    </select>
</template>

<style scoped>
.font-size-picker {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-width: 80px;
}

.font-size-picker:focus {
  outline: none;
  border-color: #007bff;
}
</style>