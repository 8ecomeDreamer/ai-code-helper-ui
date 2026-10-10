<template>
  <!-- 综合问答模块：基于纺织知识库问答，支持语音输入与图片识别 -->
  <div class="chat-view">
    <!-- 欢迎首页 -->
    <div v-if="!hasMessages && !streaming.active" class="welcome">
      <div class="hero scroll-thin">
        <div class="hero-badge">
          <AppIcon name="sparkle" :size="13" />
          <span>纺织主题智能体 · 综合问答</span>
        </div>
        <h1 class="hero-title">
          把纺织难题<br />
          变成<span class="grad">清晰答案</span>
        </h1>
        <p class="hero-sub">
          依托纺织知识库，解答面料、工艺、行业标准等专业问题，支持语音输入与图片识别
        </p>

        <div class="hero-input">
          <div v-if="attachment" class="attach-chip">
            <AppIcon name="image" :size="14" />
            <span class="attach-name">{{ attachment.name }}</span>
            <small>发送后自动识别</small>
            <button class="attach-remove" title="移除图片" @click="store.removeAttachment()">
              <AppIcon name="x" :size="12" />
            </button>
          </div>
          <ChatInput
            :disabled="disabled"
            :mic-enabled="micEnabled"
            :image-enabled="imageEnabled"
            show-hint
            @send-message="handleSend"
            @attach-image="attachImage"
            @notify="(msg, type) => store.notify(msg, type)"
          />
        </div>

        <div class="suggest">
          <div class="suggest-divider">试试这些开场</div>
          <div class="suggest-grid">
            <button
              v-for="card in suggestCards"
              :key="card.title"
              class="suggest-card"
              @click="store.sendMessage(card.question)"
            >
              <span class="suggest-icon" :style="{ color: card.color, background: card.bg }">
                <AppIcon :name="card.icon" :size="16" />
              </span>
              <span class="suggest-body">
                <span class="suggest-tag">{{ card.tag }}</span>
                <strong class="suggest-title">{{ card.title }}</strong>
                <span class="suggest-desc">{{ card.desc }}</span>
                <span class="suggest-q">{{ card.question }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 会话区 -->
    <template v-else>
      <div class="chat-head">
        <div class="chat-head-text">
          <AppIcon name="chat" :size="16" />
          <strong>{{ sessionTitle }}</strong>
        </div>
        <div class="chat-head-actions">
          <button v-if="showExport && hasMessages" class="head-btn" title="导出当前对话" @click="store.exportCurrent()">
            <AppIcon name="export" :size="14" />
            <span>导出文档</span>
          </button>
          <button class="head-btn" title="开始新对话" @click="store.newChat()">
            <AppIcon name="plus" :size="14" />
            <span>新对话</span>
          </button>
        </div>
      </div>

      <div ref="messagesRef" class="messages scroll-thin">
        <ChatMessage
          v-for="message in messages"
          :key="message.id"
          :message="message.content"
          :is-user="message.role === 'user'"
          :timestamp="message.timestamp"
          @notify="(msg, type) => store.notify(msg, type)"
        />
        <!-- AI 流式回复中 -->
        <div v-if="streaming.active" class="message ai">
          <div class="avatar">
            <AppIcon name="sparkle" :size="14" />
          </div>
          <div class="bubble-wrap">
            <div v-if="streaming.content" class="bubble markdown-body" v-html="streamingMarkdown" />
            <div v-else class="bubble thinking">
              <LoadingDots />
            </div>
            <div class="meta">
              <span v-if="streaming.content" class="meta-item streaming-flag">
                <LoadingDots />
                回复中...
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div v-if="attachment" class="attach-chip">
          <AppIcon name="image" :size="14" />
          <span class="attach-name">{{ attachment.name }}</span>
          <small>发送后自动识别</small>
          <button class="attach-remove" title="移除图片" @click="store.removeAttachment()">
            <AppIcon name="x" :size="12" />
          </button>
        </div>
        <ChatInput
          ref="chatInputRef"
          :disabled="disabled"
          :mic-enabled="micEnabled"
          :image-enabled="imageEnabled"
          placeholder="继续提问纺织相关问题，或上传面料图片识别..."
          @send-message="handleSend"
          @attach-image="attachImage"
          @notify="(msg, type) => store.notify(msg, type)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import ChatInput from '../components/ChatInput.vue'
import ChatMessage from '../components/ChatMessage.vue'
import LoadingDots from '../components/LoadingDots.vue'
import { renderMarkdown } from '../utils/markdown.js'
import { store } from '../store/index.js'

export default {
  name: 'ChatView',
  components: { AppIcon, ChatInput, ChatMessage, LoadingDots },
  data() {
    return {
      suggestCards: [
        {
          tag: '面料识别',
          title: '面料识别',
          desc: '上传图片，识别面料成分与组织',
          question: '如何鉴别纯棉和涤棉混纺面料？',
          icon: 'image',
          color: '#2f5496',
          bg: 'rgba(47,84,150,0.1)'
        },
        {
          tag: '工艺参数',
          title: '工艺参数',
          desc: '纺纱、织造、染整工艺参数咨询',
          question: '涤棉混纺面料染色需要注意哪些工艺参数？',
          icon: 'settings',
          color: '#c26a4a',
          bg: 'rgba(194,106,74,0.1)'
        },
        {
          tag: '行业标准',
          title: '行业标准',
          desc: '纺织品国标、检测方法与质量要求',
          question: 'GB 18401-2010 对纺织品安全类别是如何划分的？',
          icon: 'file',
          color: '#3a7d5d',
          bg: 'rgba(58,125,93,0.1)'
        }
      ]
    }
  },
  computed: {
    store() {
      return store
    },
    messages() {
      return store.activeSession ? store.activeSession.messages : []
    },
    sessionTitle() {
      return store.activeSession ? store.activeSession.title : ''
    },
    streaming() {
      return store.streaming
    },
    disabled() {
      return store.streaming.active
    },
    // 权限开关
    micEnabled() {
      return store.canUse('voice')
    },
    imageEnabled() {
      return store.canUse('image')
    },
    showExport() {
      return store.canUse('export')
    },
    hasMessages() {
      return this.messages.length > 0
    },
    streamingMarkdown() {
      return renderMarkdown(this.streaming.content || '')
    },
    // 待识别图片附件
    attachment() {
      return store.pendingAttachment
    }
  },
  watch: {
    // 消息变化时自动滚动到底部
    'messages.length'() {
      this.scrollToBottom()
    },
    'streaming.content'() {
      this.scrollToBottom()
    },
    'streaming.active'() {
      this.scrollToBottom()
    }
  },
  methods: {
    // 发送：先内联识别待处理图片，再发送文本提问
    async handleSend(text) {
      if (store.pendingAttachment) {
        await store.recognizePendingAttachment()
      }
      if (text) {
        store.sendMessage(text)
      }
    },
    // 挂载图片后不再跳转，输入区显示 chip，发送时内联识别
    attachImage(file) {
      store.attachImage(file)
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesRef
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    focusInput() {
      this.$nextTick(() => {
        const input = this.$refs.chatInputRef
        input && input.focus()
      })
    }
  },
  mounted() {
    this.scrollToBottom()
  }
}
</script>

<style scoped>
.chat-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== 欢迎首页 ===== */
.welcome {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero {
  width: 100%;
  max-width: 860px;
  padding: 48px 28px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-primary-strong);
  background: rgba(47, 84, 150, 0.08);
  border: 1px solid rgba(47, 84, 150, 0.16);
}

.hero-title {
  margin: 22px 0 0;
  font-size: 42px;
  line-height: 1.28;
  font-weight: 800;
  color: var(--c-text);
  letter-spacing: 1px;
}

.hero-sub {
  margin: 14px 0 0;
  font-size: 15px;
  color: var(--c-text-2);
  line-height: 1.7;
}

.hero-input {
  width: 100%;
  max-width: 720px;
  margin-top: 34px;
}

/* 待识别图片 chip */
.attach-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  margin: 0 auto 8px;
  padding: 7px 12px;
  border-radius: 12px;
  font-size: 12.5px;
  color: var(--c-primary-strong);
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.2);
}

.hero-input .attach-chip,
.chat-input-area .attach-chip {
  display: flex;
  width: fit-content;
}

.attach-chip .attach-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.attach-chip small {
  color: var(--c-text-3);
  flex-shrink: 0;
}

.attach-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--c-text-3);
  background: rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.attach-remove:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

/* 建议卡片 */
.suggest {
  width: 100%;
  margin-top: 42px;
}

.suggest-divider {
  position: relative;
  font-size: 13px;
  color: var(--c-text-3);
  padding: 18px 0;
}

.suggest-divider::before,
.suggest-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 220px;
  height: 1px;
  background: var(--c-border);
}

.suggest-divider::before {
  left: 50%;
  transform: translateX(-300px);
}

.suggest-divider::after {
  left: 50%;
  transform: translateX(80px);
}

.suggest-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.suggest-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.suggest-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: rgba(47, 84, 150, 0.25);
}

.suggest-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggest-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}

.suggest-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-primary);
  background: rgba(47, 84, 150, 0.08);
  padding: 2px 10px;
  border-radius: 999px;
}

.suggest-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text);
}

.suggest-desc {
  font-size: 12.5px;
  color: var(--c-text-2);
  line-height: 1.6;
}

.suggest-q {
  width: 100%;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.12);
  padding: 7px 10px;
  border-radius: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.suggest-card:hover .suggest-q {
  background: var(--c-primary-soft);
  border-color: rgba(47, 84, 150, 0.3);
}

/* ===== 会话区 ===== */
.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--c-border-soft);
  flex-shrink: 0;
}

.chat-head-text {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--c-primary);
}

.chat-head-text strong {
  font-size: 14px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.head-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--c-text-2);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  transition: all 0.15s ease;
}

.head-btn:hover {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.35);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 26px 22px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* AI 流式回复：与 ChatMessage 的 AI 消息同款文档流布局 */
.message.ai {
  display: flex;
  gap: 12px;
}

.message.ai .avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 4px 10px rgba(47, 84, 150, 0.25);
}

.bubble-wrap {
  flex: 1;
  min-width: 0;
  max-width: 860px;
  display: flex;
  flex-direction: column;
}

.bubble.markdown-body {
  padding: 3px 2px;
}

.bubble.thinking {
  display: flex;
  align-items: center;
  width: fit-content;
  padding: 12px 18px;
  border-radius: 12px 12px 12px 4px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-sm);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.streaming-flag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-primary);
  background: rgba(47, 84, 150, 0.08);
}

.chat-input-area {
  flex-shrink: 0;
  padding: 12px 22px 16px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--c-border-soft);
}

.chat-input-area > * {
  max-width: 860px;
  margin: 0 auto;
}

@media (max-width: 860px) {
  .hero-title {
    font-size: 32px;
  }

  .suggest-grid {
    grid-template-columns: 1fr;
  }

  .suggest-divider::before,
  .suggest-divider::after {
    width: 25%;
  }

  .suggest-divider::before {
    transform: translateX(-160%);
  }

  .suggest-divider::after {
    transform: translateX(60%);
  }
}
</style>
