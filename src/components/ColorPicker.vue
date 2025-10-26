<!-- <script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()
const showPicker = ref(false)

// 常用颜色选项
const colorOptions = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
]

const currentColor = computed(() => {
    return editor.value?.getAttributes('textStyle')?.color || '#000000'
})

const setColor = (color: string) => {
    editor.value?.chain().focus().setColor(color).run()
    showPicker.value = false
}

const togglePicker = () => {
    showPicker.value = !showPicker.value
}

// 点击外部关闭颜色选择器
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.color-picker')) {
        showPicker.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <div class="color-picker">
        <button 
            class="color-trigger"
            :style="{ backgroundColor: currentColor }"
            @click="togglePicker"
        >
            A
        </button>
        
        <div v-if="showPicker" class="color-panel">
            <div class="color-grid">
                <div
                    v-for="color in colorOptions"
                    :key="color"
                    class="color-option"
                    :style="{ backgroundColor: color }"
                    @click="setColor(color)"
                >
                </div>
            </div>
            <input 
                type="color" 
                :value="currentColor" 
                @input="setColor(($event.target as HTMLInputElement).value)"
                class="custom-color-input"
            />
        </div>
    </div>
</template>

<style scoped>
.color-picker {
    position: relative;
    display: inline-block;
}

.color-trigger {
    width: 30px;
    height: 30px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #333;
}

.color-panel {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 1000;
    margin-top: 4px;
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    margin-bottom: 8px;
}

.color-option {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #eee;
}

.color-option:hover {
    transform: scale(1.1);
}

.custom-color-input {
    width: 100%;
    height: 30px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
}
</style> -->



<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()
const showPicker = ref(false)

// 常用颜色选项
const colorOptions = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'
]

interface Props{
    type:'text'|'background'
}
const props=defineProps<Props>()

const currentColor = computed(() => {
    if(props.type==='text'){
        return editor.value?.getAttributes('textStyle')?.color || '#000000'
    }else{
        return editor.value?.getAttributes('textStyle')?.backgroundColor || 'transparent'
    }
})

const setColor = (color: string) => {
    if(props.type==='text'){
        editor.value?.chain().focus().setColor(color).run()
    }else{
        editor.value?.chain().focus().setBackgroundColor(color).run()
    }
    showPicker.value = false
}

const togglePicker = () => {
    showPicker.value = !showPicker.value
}

// 点击外部关闭颜色选择器
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.color-picker')) {
        showPicker.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <div class="color-picker">
        <button 
            class="color-trigger"
            :style="{ backgroundColor: currentColor }"
            @click="togglePicker"
        >
            A
        </button>
        
        <div v-if="showPicker" class="color-panel">
            <div class="color-grid">
                <div
                    v-for="color in colorOptions"
                    :key="color"
                    class="color-option"
                    :style="{ backgroundColor: color }"
                    @click="setColor(color)"
                >
                </div>
            </div>
            <input 
                type="color" 
                :value="currentColor" 
                @input="setColor(($event.target as HTMLInputElement).value)"
                class="custom-color-input"
            />
        </div>
    </div>
</template>

<style scoped>
.color-picker {
    position: relative;
    display: inline-block;
}

.color-trigger {
    width: 30px;
    height: 30px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #333;
}

.color-panel {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 1000;
    margin-top: 4px;
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    margin-bottom: 8px;
}

.color-option {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #eee;
}

.color-option:hover {
    transform: scale(1.1);
}

.custom-color-input {
    width: 100%;
    height: 30px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
}
</style>