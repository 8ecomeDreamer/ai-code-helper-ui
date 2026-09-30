<template>
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <!-- 模块标题 -->
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="mic" :size="14" />
          <span>语音交互</span>
        </div>
        <h2 class="module-title">开口提问，<span class="grad">实时转写</span></h2>
        <p class="module-sub">基于浏览器语音识别，边说边转写，完成后一键发送到智能问答</p>
      </div>

      <!-- 麦克风舞台 -->
      <div class="voice-stage">
        <button
          :class="['mic-button', { recording }]"
          :disabled="!supported"
          :title="recording ? '停止录音' : '开始录音'"
          @click="toggle"
        >
          <span v-if="recording" class="mic-ring"></span>
          <span v-if="recording" class="mic-ring r2"></span>
          <AppIcon :name="recording ? 'stop' : 'mic'" :size="26" />
        </button>
        <div class="mic-state">
          {{ stateText }}
        </div>
      </div>

      <!-- 转写结果 -->
      <div class="voice-card">
        <div class="voice-card-head">
          <span>转写结果</span>
          <div class="voice-card-actions">
            <button :disabled="!transcript" @click="speak">朗读</button>
            <button :disabled="!transcript" @click="copy">复制</button>
            <button :disabled="!transcript" @click="clear">清空</button>
          </div>
        </div>
        <div class="voice-transcript scroll-thin">
          <template v-if="transcript || interim">
            {{ transcript }}<span class="interim">{{ interim }}</span>
          </template>
          <span v-else class="voice-placeholder">识别结果将实时显示在这里...</span>
        </div>
        <div class="voice-card-foot">
          <button
            class="primary-btn"
            :disabled="!transcript.trim()"
            @click="sendToChat"
          >
            <AppIcon name="send" :size="14" />
            <span>发送到问答</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import { store } from '../store/index.js'

export default {
  name: 'VoiceView',
  components: { AppIcon },
  data() {
    return {
      recording: false,
      transcript: '',
      interim: '',
      recognition: null
    }
  },
  computed: {
    supported() {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    },
    stateText() {
      if (!this.supported) return '当前浏览器不支持语音识别，推荐使用 Chrome 浏览器'
      return this.recording ? '正在聆听，点击麦克风结束' : '点击麦克风开始说话'
    }
  },
  methods: {
    // 转写结果发送到问答并跳转问答路由
    sendToChat() {
      if (store.sendMessage(this.transcript.trim())) {
        this.$router.push({ name: 'chat' })
      }
    },
    toggle() {
      if (!this.supported) return
      if (this.recording) {
        this.recognition && this.recognition.stop()
        return
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = event => {
        let finalText = ''
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript
          } else {
            interimText += result[0].transcript
          }
        }
        if (finalText) {
          this.transcript += finalText
        }
        this.interim = interimText
      }
      recognition.onend = () => {
        this.recording = false
        this.interim = ''
      }
      recognition.onerror = event => {
        this.recording = false
        this.interim = ''
        store.notify(`语音识别出错：${event.error}`)
      }
      this.recognition = recognition
      recognition.start()
      this.recording = true
    },
    clear() {
      this.transcript = ''
      this.interim = ''
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.transcript)
        store.notify('已复制到剪贴板')
      } catch (error) {
        store.notify('复制失败，请手动选择文本复制')
      }
    },
    speak() {
      if (!('speechSynthesis' in window)) {
        store.notify('当前浏览器不支持语音朗读')
        return
      }
      const utterance = new SpeechSynthesisUtterance(this.transcript)
      utterance.lang = 'zh-CN'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }
  },
  beforeUnmount() {
    if (this.recognition) {
      this.recognition.onend = null
      this.recognition.abort()
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
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

/* 麦克风 */
.voice-stage {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.mic-button {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 12px 28px rgba(47, 84, 150, 0.32);
  transition: transform 0.18s ease;
}

.mic-button:hover:not(:disabled) {
  transform: scale(1.05);
}

.mic-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mic-button.recording {
  background: linear-gradient(135deg, #b8543f, #c26a4a);
  box-shadow: 0 12px 28px rgba(194, 106, 74, 0.35);
}

.mic-ring {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid rgba(194, 106, 74, 0.45);
  animation: pulse 1.6s infinite ease-out;
}

.mic-ring.r2 {
  animation-delay: 0.8s;
}

@keyframes pulse {
  0% {
    transform: scale(0.85);
    opacity: 1;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

.mic-state {
  font-size: 13px;
  color: var(--c-text-2);
}

/* 转写卡片 */
.voice-card {
  width: 100%;
  margin-top: 34px;
  border-radius: var(--radius-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.voice-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border-soft);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-2);
}

.voice-card-actions {
  display: flex;
  gap: 6px;
}

.voice-card-actions button {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-text-2);
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border-soft);
  transition: all 0.15s ease;
}

.voice-card-actions button:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.3);
}

.voice-card-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.voice-transcript {
  min-height: 130px;
  max-height: 240px;
  overflow-y: auto;
  padding: 16px 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--c-text);
  white-space: pre-wrap;
}

.voice-placeholder {
  color: var(--c-text-3);
}

.interim {
  color: var(--c-accent);
  opacity: 0.8;
}

.voice-card-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--c-border-soft);
  background: var(--c-primary-softer);
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
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
