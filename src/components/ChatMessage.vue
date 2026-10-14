<template>
  <div :class="['chat-message', isUser ? 'user-message' : 'ai-message']">
    <div class="msg-avatar" :class="isUser ? 'user' : 'ai'">
      <AppIcon :name="isUser ? 'user' : 'logo'" :size="16" />
    </div>
    <div class="msg-main">
      <div class="msg-bubble" :class="isUser ? 'user' : 'ai'">
        <!-- 用户附件：图片缩略图网格 -->
        <div v-if="isUser && attachImages.length" class="attach-images">
          <div
            v-for="(url, i) in attachImages"
            :key="'img-' + i"
            class="attach-image-item"
            @click="lightboxSrc = url"
          >
            <img :src="url" alt="图片" />
          </div>
        </div>
        <!-- 用户附件：文件 chip -->
        <div v-if="isUser && attachFiles.length" class="attach-files">
          <div
            v-for="(f, i) in attachFiles"
            :key="'file-' + i"
            class="attach-file-item"
          >
            <AppIcon name="file" :size="13" />
            <span class="attach-file-name">{{ f.name }}</span>
            <small v-if="f.size">{{ formatSize(f.size) }}</small>
          </div>
        </div>
        <!-- 用户消息文本（优先展示原始文字，而非拼入 URL 的正文） -->
        <pre v-if="isUser && userText" class="msg-text">{{ userText }}</pre>
        <!-- AI 回复使用 Markdown 渲染 -->
        <div v-else-if="!isUser" class="markdown-body" v-html="renderedMessage"></div>
      </div>
      <div class="msg-meta">
        <span class="msg-time">{{ formatTime(timestamp) }}</span>
        <template v-if="!isUser">
          <button class="msg-action" title="复制内容" @click="copyContent">
            <AppIcon name="copy" :size="13" />
          </button>
          <button
            class="msg-action"
            :title="speaking ? '停止朗读' : '朗读回复'"
            @click="toggleSpeak"
          >
            <AppIcon :name="speaking ? 'stop' : 'speaker'" :size="13" />
          </button>
        </template>
      </div>
    </div>
  </div>
  <!-- 图片全屏预览 -->
  <Teleport to="body">
    <div v-if="lightboxSrc" class="msg-lightbox" @click="lightboxSrc = ''">
      <img :src="lightboxSrc" class="msg-lightbox-img" alt="预览" @click.stop />
      <button class="msg-lightbox-close" @click="lightboxSrc = ''">&times;</button>
    </div>
  </Teleport>
</template>

<script>
import AppIcon from './AppIcon.vue'
import { formatTime } from '../utils/index.js'
import { renderMarkdown, plainText } from '../utils/markdown.js'

export default {
  name: 'ChatMessage',
  components: { AppIcon },
  props: {
    message: {
      type: String,
      required: true
    },
    // 用户消息附件元数据：{ text, images: [url], files: [{name,url,size}] }
    attachments: {
      type: Object,
      default: null
    },
    isUser: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: [Date, Number],
      default: () => Date.now()
    }
  },
  emits: ['notify'],
  data() {
    return {
      speaking: false,
      lightboxSrc: ''
    }
  },
  computed: {
    attachImages() {
      return (this.attachments && this.attachments.images) || []
    },
    attachFiles() {
      return (this.attachments && this.attachments.files) || []
    },
    // 用户气泡文本：有附件元数据时只展示原始文字（可为空），否则展示正文
    userText() {
      if (this.attachments) return this.attachments.text || ''
      return this.message
    },
    renderedMessage() {
      return renderMarkdown(this.message)
    }
  },
  methods: {
    formatTime,
    formatSize(size) {
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    },
    async copyContent() {
      try {
        await navigator.clipboard.writeText(this.message)
        this.$emit('notify', '已复制到剪贴板')
      } catch (error) {
        this.$emit('notify', '复制失败，请手动选择文本复制')
      }
    },
    toggleSpeak() {
      if (!('speechSynthesis' in window)) {
        this.$emit('notify', '当前浏览器不支持语音朗读')
        return
      }
      if (this.speaking) {
        window.speechSynthesis.cancel()
        this.speaking = false
        return
      }
      const utterance = new SpeechSynthesisUtterance(plainText(this.message))
      utterance.lang = 'zh-CN'
      utterance.rate = 1
      utterance.onend = () => {
        this.speaking = false
      }
      utterance.onerror = () => {
        this.speaking = false
      }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
      this.speaking = true
    }
  },
  beforeUnmount() {
    if (this.speaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
}
</script>

<style scoped>
.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.user-message {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg-avatar.ai {
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 4px 10px rgba(47, 84, 150, 0.25);
}

.msg-avatar.user {
  color: var(--c-primary-strong);
  background: linear-gradient(135deg, #e8eef8, #f3ecdf);
  border: 1px solid rgba(47, 84, 150, 0.15);
}

.msg-main {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.user-message .msg-main {
  max-width: min(76%, 760px);
  align-items: flex-end;
}

/* AI 回复采用知识库式文档流：不加气泡边框，长文平铺更易读 */
.ai-message .msg-main {
  flex: 1;
  max-width: 860px;
}

.msg-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  word-wrap: break-word;
  word-break: break-word;
}

.msg-bubble.ai {
  padding: 3px 2px;
  background: transparent;
  border: none;
  box-shadow: none;
  color: var(--c-text);
}

.msg-bubble.user {
  background: linear-gradient(135deg, #2f5496, #4066ad);
  border-top-right-radius: 6px;
  box-shadow: 0 6px 16px rgba(47, 84, 150, 0.22);
  color: #fff;
}

.msg-text {
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

/* 用户附件：图片缩略图 */
.attach-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.attach-image-item {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.attach-image-item:hover {
  transform: scale(1.04);
}

.attach-image-item img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  display: block;
}

.attach-images + .msg-text,
.attach-files + .msg-text {
  margin-top: 6px;
}

/* 用户附件：文件 chip */
.attach-files {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.attach-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 12.5px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  transition: background 0.15s ease;
}

.attach-file-item:hover {
  background: rgba(255, 255, 255, 0.26);
}

.attach-file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-file-item small {
  opacity: 0.8;
  flex-shrink: 0;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  padding: 0 2px;
}

.msg-time {
  font-size: 11px;
  color: var(--c-text-3);
}

.msg-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--c-text-3);
  opacity: 0;
  transition: all 0.15s ease;
}

.chat-message:hover .msg-action {
  opacity: 1;
}

.msg-action:hover {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

@media (max-width: 768px) {
  .msg-main {
    max-width: 86%;
  }
}

/* 图片全屏预览 Lightbox */
.msg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.msg-lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
  cursor: default;
  object-fit: contain;
}

.msg-lightbox-close {
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

.msg-lightbox-close:hover {
  opacity: 1;
}
</style>
