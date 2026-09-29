<template>
  <div class="chat-input">
    <div :class="['input-card', { focused, disabled, recording }]">
      <textarea
        ref="inputRef"
        v-model="inputMessage"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input-textarea scroll-thin"
        rows="1"
        @keydown="handleKeyDown"
        @input="adjustHeight"
        @focus="focused = true"
        @blur="focused = false"
      />
      <div class="input-toolbar">
        <div class="tool-group">
          <button
            :class="['tool-btn', { active: recording, denied: !micEnabled }]"
            :title="micTitle"
            @click="toggleMic"
          >
            <AppIcon :name="recording ? 'stop' : 'mic'" :size="15" />
            <span v-if="recording" class="tool-label">聆听中</span>
          </button>
          <button
            :class="['tool-btn', { denied: !imageEnabled }]"
            :title="imageEnabled ? '上传图片识别内容' : '当前权限未开放图片识别'"
            @click="pickImage"
          >
            <AppIcon :name="imageEnabled ? 'image' : 'lock'" :size="15" />
          </button>
          <input
            ref="fileRef"
            type="file"
            accept="image/*"
            hidden
            @change="onFileChange"
          />
        </div>
        <div class="tool-right">
          <span v-if="interim" class="mic-interim">{{ interim }}</span>
          <button
            :disabled="disabled || !inputMessage.trim()"
            class="send-btn"
            title="发送"
            @click="sendMessage"
          >
            <AppIcon name="send" :size="15" />
          </button>
        </div>
      </div>
    </div>
    <div v-if="showHint" class="input-hint">
      <kbd>Enter</kbd><span>发送</span>
      <span class="dot">·</span>
      <kbd>Shift + Enter</kbd><span>换行</span>
    </div>
  </div>
</template>

<script>
import AppIcon from './AppIcon.vue'

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
      default: '请输入您的问题...'
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
    // 权限开关：图片识别入口
    imageEnabled: {
      type: Boolean,
      default: true
    }
  },
  emits: ['send-message', 'attach-image', 'notify'],
  data() {
    return {
      inputMessage: '',
      focused: false,
      recording: false,
      interim: '',
      recognition: null
    }
  },
  computed: {
    micTitle() {
      if (!this.micEnabled) return '当前权限未开放语音输入'
      return this.recording ? '停止语音输入' : '语音输入'
    }
  },
  methods: {
    sendMessage() {
      if (this.inputMessage.trim() && !this.disabled) {
        this.$emit('send-message', this.inputMessage.trim())
        this.inputMessage = ''
        this.adjustHeight()
      }
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
    pickImage() {
      if (!this.imageEnabled) {
        this.$emit('notify', '当前账号权限未开放图片识别功能', 'error')
        return
      }
      this.$refs.fileRef.click()
    },
    onFileChange(event) {
      const file = event.target.files && event.target.files[0]
      if (file) {
        this.$emit('attach-image', file)
      }
      event.target.value = ''
    },
    toggleMic() {
      if (!this.micEnabled) {
        this.$emit('notify', '当前账号权限未开放语音输入功能', 'error')
        return
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        this.$emit('notify', '当前浏览器不支持语音识别，推荐使用 Chrome 浏览器')
        return
      }
      if (this.recording) {
        this.recognition && this.recognition.stop()
        return
      }
      const recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'   // 设置语言为简体中文
      recognition.continuous = true // 启用持续录音模式（不断说话会持续识别）
      recognition.interimResults = true // 启用实时返回临时结果（非最终结果）
      recognition.onresult = event => {
        let finalText = '' // 最终确认的文本（不可变）
        let interimText = ''   // 临时文本（可能被修正）
        // 从最新结果开始遍历
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript // 累加最终结果
          } else {
            interimText += result[0].transcript  // 累加临时结果
          }
        }
        // 只有最终结果才更新输入框内容
        if (finalText) {
          this.inputMessage += finalText
          this.adjustHeight() // 调整输入框高度（见前一个问题）
        }
        this.interim = interimText // 显示临时结果
      }
      recognition.onend = () => {
        this.recording = false // 更新 UI 状态
        this.interim = '' // 清空临时结果显示
      }
      recognition.onerror = event => {
        this.recording = false
        this.interim = ''
        this.$emit('notify', `语音识别出错：${event.error}`)
      }
      this.recognition = recognition
      recognition.start()
      this.recording = true
    },
    focus() {
      this.$refs.inputRef.focus()
    }
  },
  mounted() {
    this.adjustHeight()
  },
  beforeUnmount() {
    if (this.recognition) {
      this.recognition.onend = null
      this.recognition.abort()
    }
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

.tool-btn.denied {
  color: var(--c-text-3);
  background: rgba(0, 0, 0, 0.03);
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
</style>
