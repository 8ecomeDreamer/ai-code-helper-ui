<template>
  <div :class="['chat-message', isUser ? 'user-message' : 'ai-message']">
    <div class="msg-avatar" :class="isUser ? 'user' : 'ai'">
      <AppIcon :name="isUser ? 'user' : 'logo'" :size="16" />
    </div>
    <div class="msg-main">
      <div class="msg-bubble" :class="isUser ? 'user' : 'ai'">
        <!-- 用户消息使用普通文本 -->
        <pre v-if="isUser" class="msg-text">{{ message }}</pre>
        <!-- AI 回复使用 Markdown 渲染 -->
        <div v-else class="markdown-body" v-html="renderedMessage"></div>
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
      speaking: false
    }
  },
  computed: {
    renderedMessage() {
      return renderMarkdown(this.message)
    }
  },
  methods: {
    formatTime,
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
</style>
