<template>
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <!-- 模块标题 -->
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="image" :size="14" />
          <span>图片识别</span>
        </div>
        <h2 class="module-title">上传面料图片，<span class="grad">读懂内容</span></h2>
        <p class="module-sub">支持织物照片、工艺单截图，识别结果可存入问答记录或导出文档</p>
      </div>

      <!-- 上传区 / 预览 -->
      <div
        v-if="!file"
        class="dropzone"
        :class="{ dragover }"
        @click="$refs.fileRef.click()"
        @dragover.prevent="dragover = true"
        @dragleave="dragover = false"
        @drop.prevent="onDrop"
      >
        <input
          ref="fileRef"
          type="file"
          accept="image/*"
          hidden
          @change="onFileChange"
        />
        <div class="dropzone-icon">
          <AppIcon name="upload" :size="26" />
        </div>
        <div class="dropzone-title">点击或拖拽图片到此处</div>
        <div class="dropzone-sub">支持 JPG / PNG / WebP，单张不超过 10MB</div>
      </div>

      <div v-else class="preview-card">
        <div class="preview-head">
          <div class="preview-name">
            <AppIcon name="image" :size="15" />
            <span :title="file.name">{{ file.name }}</span>
            <small>{{ sizeText }}</small>
          </div>
          <button class="preview-remove" title="移除图片" @click="removeFile">
            <AppIcon name="x" :size="14" />
          </button>
        </div>
        <div class="preview-body">
          <img :src="previewUrl" alt="待识别图片预览" />
        </div>
        <div class="preview-foot">
          <button class="ghost-btn" @click="$refs.fileRef.click()">
            <AppIcon name="upload" :size="14" />
            <span>重新上传</span>
          </button>
          <input
            ref="fileRef"
            type="file"
            accept="image/*"
            hidden
            @change="onFileChange"
          />
          <button class="primary-btn" :disabled="recognizing" @click="recognize">
            <AppIcon name="sparkle" :size="14" />
            <span>{{ recognizing ? '识别中...' : '开始识别' }}</span>
          </button>
        </div>
      </div>

      <!-- 识别结果 -->
      <div v-if="result" class="result-card">
        <div class="result-head">
          <span>识别结果</span>
          <div class="result-actions">
            <button @click="copyResult">复制</button>
            <button @click="saveResult">
              存入问答记录
            </button>
          </div>
        </div>
        <div class="result-body markdown-body" v-html="renderedResult"></div>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import { recognizeImage } from '../api/chatApi.js'
import { renderMarkdown } from '../utils/markdown.js'
import { store } from '../store/index.js'

const MAX_SIZE = 10 * 1024 * 1024

export default {
  name: 'ImageView',
  components: { AppIcon },
  data() {
    return {
      file: null,
      previewUrl: '',
      dragover: false,
      recognizing: false,
      result: ''
    }
  },
  computed: {
    // 问答输入框跨模块预填的图片
    prefillFile() {
      return store.imagePrefill
    },
    sizeText() {
      if (!this.file) return ''
      const kb = this.file.size / 1024
      return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`
    },
    renderedResult() {
      return renderMarkdown(this.result)
    }
  },
  watch: {
    prefillFile: {
      immediate: true,
      handler(file) {
        if (file) {
          this.setFile(file)
          store.imagePrefill = null
        }
      }
    }
  },
  methods: {
    onFileChange(event) {
      const file = event.target.files && event.target.files[0]
      if (file) this.setFile(file)
      event.target.value = ''
    },
    onDrop(event) {
      this.dragover = false
      const file = event.dataTransfer.files && event.dataTransfer.files[0]
      if (file) this.setFile(file)
    },
    setFile(file) {
      if (!file.type.startsWith('image/')) {
        store.notify('仅支持图片文件，请重新选择')
        return
      }
      if (file.size > MAX_SIZE) {
        store.notify('图片超过 10MB，请压缩后重试')
        return
      }
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
      }
      this.file = file
      this.previewUrl = URL.createObjectURL(file)
      this.result = ''
    },
    removeFile() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
      }
      this.file = null
      this.previewUrl = ''
      this.result = ''
    },
    async recognize() {
      if (!this.file || this.recognizing) return
      this.recognizing = true
      this.result = ''
      try {
        const text = await recognizeImage(this.file)
        this.result = text || '识别完成，但后端未返回内容'
        store.notify('图片识别完成')
      } catch (error) {
        console.error('图片识别失败:', error)
        store.notify('识别服务连接失败，请确认后端 /api/ai/image/recognize 已启动')
      } finally {
        this.recognizing = false
      }
    },
    // 存入问答记录后跳转问答路由
    saveResult() {
      store.saveImageResult({ fileName: this.file ? this.file.name : '图片', result: this.result })
      this.$router.push({ name: 'chat' })
    },
    async copyResult() {
      try {
        await navigator.clipboard.writeText(this.result)
        store.notify('已复制到剪贴板')
      } catch (error) {
        store.notify('复制失败，请手动选择文本复制')
      }
    }
  },
  beforeUnmount() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
    }
  }
}
</script>

<style scoped>
.module-view {
  height: 100%;
  overflow-y: auto;
  background:
    radial-gradient(800px 360px at 50% -60px, rgba(47, 84, 150, 0.07), transparent 70%),
    linear-gradient(180deg, #f7f5f0 0%, var(--c-bg) 55%);
}

.module-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 7vh 28px 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.module-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.module-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(47, 84, 150, 0.16);
  color: var(--c-primary);
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.module-title {
  margin: 18px 0 0;
  font-size: clamp(24px, 3.4vw, 34px);
  font-weight: 800;
  color: var(--c-text);
}

.module-sub {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: var(--c-text-2);
  text-align: center;
}

/* 上传区 */
.dropzone {
  width: 100%;
  margin-top: 38px;
  padding: 52px 24px;
  border-radius: var(--radius-xl);
  border: 2px dashed rgba(47, 84, 150, 0.28);
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.dropzone:hover,
.dropzone.dragover {
  border-color: rgba(47, 84, 150, 0.55);
  background: #fff;
  box-shadow: var(--shadow-md);
}

.dropzone-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.dropzone-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
}

.dropzone-sub {
  font-size: 12px;
  color: var(--c-text-3);
}

/* 预览卡片 */
.preview-card {
  width: 100%;
  margin-top: 38px;
  border-radius: var(--radius-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border-soft);
}

.preview-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--c-text);
  min-width: 0;
}

.preview-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-name small {
  flex-shrink: 0;
  color: var(--c-text-3);
  font-size: 11px;
}

.preview-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  color: var(--c-text-3);
  transition: all 0.15s ease;
}

.preview-remove:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

.preview-body {
  padding: 18px;
  display: flex;
  justify-content: center;
  background: var(--c-primary-softer);
}

.preview-body img {
  max-width: 100%;
  max-height: 320px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.preview-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--c-border-soft);
}

.ghost-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--c-text-2);
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border);
  transition: all 0.15s ease;
}

.ghost-btn:hover {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.35);
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 6px 14px rgba(47, 84, 150, 0.28);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* 识别结果 */
.result-card {
  width: 100%;
  margin-top: 20px;
  border-radius: var(--radius-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border-soft);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-2);
}

.result-actions {
  display: flex;
  gap: 6px;
}

.result-actions button {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-text-2);
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border-soft);
  transition: all 0.15s ease;
}

.result-actions button:hover {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.3);
}

.result-body {
  padding: 16px 18px;
  max-height: 360px;
  overflow-y: auto;
}
</style>
