<script setup lang="ts">
import { computed } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()

const fontSizeOptions = [
    { value: '12px', label: '12px' },
    { value: '14px', label: '14px' },
    { value: '16px', label: '16px' },
    { value: '18px', label: '18px' },
    { value: '20px', label: '20px' },
    { value: '24px', label: '24px' },
    { value: '28px', label: '28px' },
    { value: '32px', label: '32px' },
    { value: '36px', label: '36px' },
    { value: '48px', label: '48px' },
]

const currentSize = computed(() => {
    return editor.value?.getAttributes('textStyle')?.fontSize || ''
})

const setFontSize = (event: Event) => {
    const size = (event.target as HTMLSelectElement).value
    if (size) {
        editor.value?.chain().focus().setFontSize(size).run()
    } else {
        editor.value?.chain().focus().unsetFontSize().run()
    }
}
</script>

<template>
    <select 
        :value="currentSize" 
        @change="setFontSize"
        class="font-size-picker"
    >
        <option value="">默认</option>
        <option 
            v-for="size in fontSizeOptions" 
            :key="size.value" 
            :value="size.value"
        >
            {{ size.label }}
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