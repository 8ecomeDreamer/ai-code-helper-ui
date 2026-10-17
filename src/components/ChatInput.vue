<template>
  <div class="chat-input">
    <div :class="['input-card', { focused, disabled, recording }]">
      <!-- 附件预览区：图片或文件（互斥） -->
      <div v-if="images.length || files.length" class="attach-area">
        <!-- 图片缩略图网格 -->
        <div v-if="images.length" class="images-preview">
          <div v-for="(img, index) in images" :key="img.id" class="image-preview">
            <img
              :src="img.src"
              alt="图片预览"
              class="preview-img"
              title="点击查看大图"
              @click="openPreview(img.src)"
            />
            <button class="clear-icon" title="移除图片" @click.stop="removeImage(index)">
              <AppIcon name="x" :size="10" />
            </button>
          </div>
        </div>
        <!-- 文件 chip 列表 -->
        <div v-if="files.length" class="files-preview">
          <div v-for="(f, index) in files" :key="f.id" class="file-chip">
            <AppIcon name="file" :size="14" />
            <span class="file-name">{{ f.name }}</span>
            <small>{{ formatSize(f.size) }}</small>
            <button class="file-remove" title="移除文件" @click.stop="removeFile(index)">
              <AppIcon name="x" :size="11" />
            </button>
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <textarea
        ref="inputRef"
        v-model="inputMessage"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input-textarea scroll-thin"
        rows="1"
        @keydown="handleKeyDown"
        @input="adjustHeight"
        @paste="handlePaste"
        @focus="focused = true"
        @blur="focused = false"
      />

      <div class="input-toolbar">
        <div class="tool-group">
          <button
            :class="['tool-btn', { active: recording, busy: transcribing, denied: !micEnabled }]"
            :title="micTitle"
            @click="toggleMic"
          >
            <AppIcon :name="recording ? 'stop' : 'mic'" :size="15" />
            <span v-if="recording" class="tool-label">聆听中</span>
            <span v-else-if="transcribing" class="tool-label">识别中</span>
          </button>
          <!-- 图片按钮：粘贴或选择图片，最多 10 张 -->
          <button
            :class="['tool-btn', { denied: !imageEnabled || hasFiles }]"
            :title="imageBtnTitle"
            @click="pickImages"
          >
            <AppIcon :name="imageEnabled && !hasFiles ? 'image' : 'lock'" :size="15" />
            <span v-if="images.length" class="tool-count">{{ images.length }}/10</span>
          </button>
          <input
            ref="imageRef"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="onImageChange"
          />
          <!-- 文件按钮：上传各类文件，与图片互斥 -->
          <button
            :class="['tool-btn', { denied: !imageEnabled || hasImages }]"
            :title="fileBtnTitle"
            @click="pickFiles"
          >
            <AppIcon :name="imageEnabled && !hasImages ? 'upload' : 'lock'" :size="15" />
          </button>
          <input
            ref="fileRef"
            type="file"
            multiple
            hidden
            @change="onFileChange"
          />
        </div>
        <div class="tool-right">
          <span v-if="interim" class="mic-interim">{{ interim }}</span>
          <button
            :disabled="disabled || !canSend"
            class="send-btn"
            title="发送"
            @click="sendMessage"
          >
            <AppIcon name="send" :size="15" />
          </button>
        </div>
      </div>
    </div>
    <!-- 图片全屏预览 Lightbox -->
    <Teleport to="body">
      <div v-if="previewSrc" class="img-lightbox" @click="previewSrc = ''">
        <img :src="previewSrc" class="img-lightbox-content" alt="预览" @click.stop />
        <button class="img-lightbox-close" @click="previewSrc = ''">&times;</button>
      </div>
    </Teleport>
    <div v-if="showHint" class="input-hint">
      <kbd>Enter</kbd><span>发送</span>
      <span class="dot">·</span>
      <kbd>Shift + Enter</kbd><span>换行</span>
      <span class="dot">·</span>
      <kbd>粘贴</kbd><span>可添加图片</span>
    </div>
  </div>
</template>

<script>
import AppIcon from './AppIcon.vue'
import { PcmWavRecorder } from '../utils/audio.js'
import { recognizeSpeech } from '../api/chatApi.js'

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 单文件 20MB

let uidSeed = 0
function nextId() {
  uidSeed += 1
  return `att-${Date.now()}-${uidSeed}`
}

export default {
  name: 'ChatInput',
  components: { AppIcon },
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: '请输入您的问题，可直接粘贴图片...'
    },
    showHint: {
      type: Boolean,
      default: false
    },
    // 权限开关：语音输入
    micEnabled: {
      type: Boolean,
      default: true
    },
    // 权限开关：图片 / 文件上传入口
    imageEnabled: {
      type: Boolean,
      default: true
    }
  },
  emits: ['send-message', 'notify'],
  data() {
    return {
      inputMessage: '',
      focused: false,
      recording: false,
      transcribing: false,
      // 录音器实例（PCM 采集 → 16k WAV，接百炼 ASR）
      recorder: null,
      interim: '',
      // 图片附件：[{ id, file, src, name }]
      images: [],
      // 文件附件：[{ id, file, name, size }]
      files: [],
      // 图片预览大图 URL
      previewSrc: ''
    }
  },
  computed: {
    micTitle() {
      if (!this.micEnabled) return '当前权限未开放语音输入'
      if (this.transcribing) return '语音识别中...'
      return this.recording ? '停止语音输入并识别' : '语音输入'
    },
    hasImages() {
      return this.images.length > 0
    },
    hasFiles() {
      return this.files.length > 0
    },
    imageBtnTitle() {
      if (!this.imageEnabled) return '当前权限未开放图片上传'
      if (this.hasFiles) return '已上传文件，无法同时添加图片'
      return '选择图片（最多 10 张，也可直接粘贴）'
    },
    fileBtnTitle() {
      if (!this.imageEnabled) return '当前权限未开放文件上传'
      if (this.hasImages) return '已有图片，无法同时上传文件'
      return '上传文件（支持各类格式）'
    },
    // 有文字或有附件即可发送
    canSend() {
      return Boolean(this.inputMessage.trim()) || this.hasImages || this.hasFiles
    }
  },
  methods: {
    formatSize(size) {
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    },
    // 添加图片文件（去重、限量、生成缩略图）
    addImageFiles(fileList) {
      const incoming = Array.from(fileList).filter(file => file.type.startsWith('image/'))
      if (!incoming.length) return
      if (!this.imageEnabled) {
        this.$emit('notify', '当前账号权限未开放图片上传功能', 'error')
        return
      }
      for (const file of incoming) {
        if (this.images.length >= MAX_IMAGES) {
          this.$emit('notify', `最多只能添加 ${MAX_IMAGES} 张图片`, 'error')
          break
        }
        this.images.push({
          id: nextId(),
          file,
          name: file.name || '粘贴图片.png',
          src: URL.createObjectURL(file)
        })
      }
    },
    // 添加普通文件（非图片，与图片互斥）
    addFiles(fileList) {
      const incoming = Array.from(fileList)
      if (!incoming.length) return
      if (!this.imageEnabled) {
        this.$emit('notify', '当前账号权限未开放文件上传功能', 'error')
        return
      }
      if (this.hasImages) {
        this.$emit('notify', '文件不能与图片同时上传，请先移除图片', 'error')
        return
      }
      for (const file of incoming) {
        if (file.type.startsWith('image/')) {
          // 文件选择器里选中图片时归入图片区
          this.addImageFiles([file])
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          this.$emit('notify', `「${file.name}」超过 20MB，已跳过`, 'error')
          continue
        }
        this.files.push({
          id: nextId(),
          file,
          name: file.name,
          size: file.size
        })
      }
    },
    removeImage(index) {
      const [img] = this.images.splice(index, 1)
      if (img && img.src) URL.revokeObjectURL(img.src)
    },
    removeFile(index) {
      this.files.splice(index, 1)
    },
    clearAttachments() {
      this.images.forEach(img => img.src && URL.revokeObjectURL(img.src))
      this.images = []
      this.files = []
    },
    handlePaste(event) {
      const items = event.clipboardData && event.clipboardData.items
      if (!items) return
      const imageFiles = []
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length) {
        event.preventDefault()
        this.addImageFiles(imageFiles)
      }
    },
    pickImages() {
      if (!this.imageEnabled) {
        this.$emit('notify', '当前账号权限未开放图片上传功能', 'error')
        return
      }
      if (this.hasFiles) {
        this.$emit('notify', '文件不能与图片同时上传，请先移除文件', 'error')
        return
      }
      this.$refs.imageRef.click()
    },
    onImageChange(event) {
      if (event.target.files && event.target.files.length) {
        this.addImageFiles(event.target.files)
      }
      event.target.value = ''
    },
    pickFiles() {
      if (!this.imageEnabled) {
        this.$emit('notify', '当前账号权限未开放文件上传功能', 'error')
        return
      }
      if (this.hasImages) {
        this.$emit('notify', '文件不能与图片同时上传，请先移除图片', 'error')
        return
      }
      this.$refs.fileRef.click()
    },
    onFileChange(event) {
      if (event.target.files && event.target.files.length) {
        this.addFiles(event.target.files)
      }
      event.target.value = ''
    },
    sendMessage() {
      if (this.disabled || !this.canSend) return
      const text = this.inputMessage.trim()
      // 携带附件快照传出，附件上传由父级处理
      this.$emit('send-message', {
        text,
        images: this.images.map(img => img.file),
        files: this.files.map(f => f.file)
      })
      this.inputMessage = ''
      this.clearAttachments()
      this.adjustHeight()
    },
    handleKeyDown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    adjustHeight() {
      this.$nextTick(() => {
        const textarea = this.$refs.inputRef
        if (!textarea) return
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
      })
    },
    /**
     * 语音输入：录音（Web Audio 采 PCM → 16k WAV）后上送 /ai/asr 由百炼 paraformer 识别。
     * 原 Web Speech API 依赖 Google 语音服务，国内网络基本不可用，改走服务端 ASR。
     */
    async toggleMic() {
      if (!this.micEnabled) {
        this.$emit('notify', '当前账号权限未开放语音输入功能', 'error')
        return
      }
      if (this.transcribing) return
      if (this.recording) {
        this.stopAndRecognize()
        return
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.$emit('notify', '当前浏览器不支持录音，推荐使用 Chrome/Edge', 'error')
        return
      }
      const recorder = new PcmWavRecorder()
      try {
        await recorder.start()
      } catch (err) {
        const denied = err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        this.$emit('notify', denied ? '麦克风权限被拒绝，请在浏览器地址栏允许后重试' : `录音启动失败：${err.message || err}`, 'error')
        return
      }
      this.recorder = recorder
      this.recording = true
      this.interim = '请说话，再次点击结束并识别'
    },
    /** 停止录音 → 上传识别 → 文本追加进输入框 */
    async stopAndRecognize() {
      const recorder = this.recorder
      this.recorder = null
      this.recording = false
      this.interim = ''
      if (!recorder) return
      this.transcribing = true
      try {
        const wavBlob = await recorder.stop()
        if (!wavBlob || wavBlob.size < 2000) {
          this.$emit('notify', '录音时间太短，请长按后说话再试', 'error')
          return
        }
        const text = await recognizeSpeech(wavBlob)
        if (text) {
          this.inputMessage = this.inputMessage ? `${this.inputMessage} ${text}` : text
          this.adjustHeight()
        } else {
          this.$emit('notify', '未识别到有效语音内容', 'error')
        }
      } catch (err) {
        this.$emit('notify', `语音识别失败：${err.message || err}`, 'error')
      } finally {
        this.transcribing = false
      }
    },
    openPreview(src) {
      this.previewSrc = src
    },
    focus() {
      this.$refs.inputRef.focus()
    }
  },
  mounted() {
    this.adjustHeight()
  },
  beforeUnmount() {
    // 录音未结束时卸载：释放麦克风与 AudioContext，防资源泄漏
    if (this.recorder) {
      this.recorder.stop().catch(() => {})
      this.recorder = null
    }
    // 释放图片预览 URL
    this.images.forEach(img => img.src && URL.revokeObjectURL(img.src))
  }
}
</script>

<style scoped>
.chat-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.input-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 10px;
  border-radius: var(--radius-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-md);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-card.focused {
  border-color: rgba(47, 84, 150, 0.45);
  box-shadow: 0 12px 32px rgba(47, 84, 150, 0.14);
}

.input-card.recording {
  border-color: rgba(194, 106, 74, 0.5);
}

.input-card.disabled {
  opacity: 0.7;
}

.input-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text);
  min-height: 26px;
  max-height: 160px;
  overflow-y: auto;
  padding: 2px 2px 0;
}

.input-textarea::placeholder {
  color: var(--c-text-3);
}

.input-textarea:disabled {
  cursor: not-allowed;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-text-2);
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border-soft);
  transition: all 0.15s ease;
}

.tool-btn:hover {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.3);
  background: var(--c-primary-soft);
}

.tool-btn.active {
  color: #fff;
  background: var(--c-accent);
  border-color: var(--c-accent);
}

.tool-btn.busy {
  opacity: 0.65;
  cursor: wait;
}

.tool-btn.denied {
  color: var(--c-text-3);
  background: rgba(0, 0, 0, 0.03);
  cursor: not-allowed;
}

.tool-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--c-primary);
}

.tool-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mic-interim {
  font-size: 12px;
  color: var(--c-accent);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 4px 12px rgba(47, 84, 150, 0.3);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.35;
  box-shadow: none;
  cursor: not-allowed;
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--c-text-3);
}

.input-hint .dot {
  margin: 0 2px;
}

/* 附件预览区 */
.attach-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px 6px;
  border-bottom: 1px solid var(--c-border-soft);
  margin-bottom: 2px;
}

.images-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-preview {
  position: relative;
  width: 40px;
  height: 40px;
}

.preview-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.preview-img:hover {
  transform: scale(1.08);
}

.clear-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--c-border);
  color: #c0392b;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.files-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: var(--c-primary-strong);
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.2);
  max-width: 240px;
}

.file-chip .file-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.file-chip small {
  color: var(--c-text-3);
  flex-shrink: 0;
}

.file-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: var(--c-text-3);
  background: rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  cursor: pointer;
}

.file-remove:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

/* 图片全屏预览 */
.img-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.img-lightbox-content {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  cursor: default;
  object-fit: contain;
}

.img-lightbox-close {
  position: absolute;
  top: 20px;
  right: 28px;
  font-size: 32px;
  color: #fff;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
  opacity: 0.8;
}

.img-lightbox-close:hover {
  opacity: 1;
}
</style>
