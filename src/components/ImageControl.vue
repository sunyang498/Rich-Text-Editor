<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEditorContext } from '@/composables/EditorContext'

const editor = useEditorContext()
const fileInput = ref<HTMLInputElement>()
const showUrlInput = ref(false)
const imageUrl = ref('')

// 对齐选项
const alignOptions = [
    { value: 'left', label: '左对齐', icon: '⫷' },
    { value: 'center', label: '居中对齐', icon: '⫸' },
    { value: 'right', label: '右对齐', icon: '⫸' },
]

// 状态检测
const isImageSelected = computed(() => {
    return editor.value?.isActive('image') || false
})

const currentImageAlign = computed(() => {
    return editor.value?.getAttributes('image')?.align || 'left'
})

const currentImageSize = computed(() => {
    return editor.value?.getAttributes('image')?.size || 'auto'
})

// 触发文件选择
const triggerFileInput = () => {
    fileInput.value?.click()
}

// 处理文件上传
const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files
    if (!files || files.length === 0) return
    for (const file of files) {
        await insertImageFromFile(file)
    }

    // 重置 input
    target.value = ''
}

// 从文件插入图片
const insertImageFromFile = (file: File): Promise<void> => {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const result = e.target?.result
            if (result) {
                editor.value?.chain().focus().setImage({ src: result as string }).run()
            }
            resolve()
        }
        reader.onerror = () => {
            console.error('图片读取失败')
            resolve()
        }
        reader.readAsDataURL(file)
    })
}

// 从URL插入图片
const insertImageFromUrl = () => {
    if (imageUrl.value.trim()) {
        editor.value?.chain().focus().setImage({ src: imageUrl.value }).run()
        imageUrl.value = ''
        showUrlInput.value = false
    }
}

// 设置图片对齐
const setImageAlign = (align: string) => {
    editor.value?.chain().focus().updateAttributes('image', { align }).run()
}

// 设置图片大小
const setImageSize = (event: Event) => {
    const size = (event.target as HTMLSelectElement).value
    editor.value?.chain().focus().updateAttributes('image', { size }).run()
}

// 删除选中图片
const deleteSelectedImage = () => {
    editor.value?.chain().focus().deleteSelection().run()
}

// 监听选择变化，更新图片控件状态
onMounted(() => {
    const updateImageState = () => {
        // 状态会在计算属性中自动更新
    }

    editor.value?.on('selectionUpdate', updateImageState)
})

onUnmounted(() => {
    // 清理监听器
})
</script>

<template>
    <div class="image-controls">
        <!-- 图片上传按钮 -->
        <button
            @click="triggerFileInput"
            class="image-button"
            title="插入图片"
        >
            <svg class="image-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
            </svg>
        </button>

        <!-- 隐藏的文件输入 -->
        <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileUpload"
            style="display: none"
            multiple
        />

        <!-- URL插入按钮 -->
        <button
            @click="showUrlInput = !showUrlInput"
            class="image-button"
            title="通过URL插入图片"
        >
            <svg class="image-icon" viewBox="0 0 24 24" width="16" height="16">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
        </button>

        <!-- URL输入框 -->
        <div v-if="showUrlInput" class="url-input-container">
            <input
                v-model="imageUrl"
                type="url"
                placeholder="输入图片URL"
                class="url-input"
                @keyup.enter="insertImageFromUrl"
            />
            <button @click="insertImageFromUrl" class="url-confirm">插入</button>
        </div>

        <!-- 图片调整控件（当图片选中时显示） -->
        <div v-if="isImageSelected" class="image-adjust-controls">
            <!-- 对齐方式 -->
            <button
                v-for="align in alignOptions"
                :key="align.value"
                @click="setImageAlign(align.value)"
                :class="['align-button', { 'is-active': currentImageAlign === align.value }]"
                :title="align.label"
            >
                {{ align.icon }}
            </button>

        <!-- 大小调整 -->
            <select 
                :value="currentImageSize" 
                @change="setImageSize"
                class="size-select"
                title="图片大小"
            >
                <option value="auto">自动</option>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
                <option value="full">全宽</option>
            </select>

        <!-- 删除图片 -->
            <button
                @click="deleteSelectedImage"
                class="delete-button"
                title="删除图片"
            >
                <svg class="delete-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        </div>
    </div>
</template>

<style scoped>
.image-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  padding: 6px;
  border-radius: 4px;
  position: relative;
}

.image-button {
  padding: 6px 8px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-button:hover {
  background: #e0e0e0;
}

.url-input-container {
  display: flex;
  gap: 4px;
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
  margin-top: 4px;
}

.url-input {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  min-width: 200px;
}

.url-confirm {
  padding: 4px 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.image-adjust-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 8px;
  border-left: 1px solid #ddd;
}

.align-button {
  padding: 4px 6px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 2px;
}

.align-button:hover {
  background: #e0e0e0;
}

.align-button.is-active {
  background: #007bff;
  color: white;
}

.size-select {
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.delete-button {
  padding: 4px 6px;
  border: 1px solid #ff6b6b;
  background: white;
  cursor: pointer;
  border-radius: 2px;
  color: #ff6b6b;
}

.delete-button:hover {
  background: #ff6b6b;
  color: white;
}
</style>