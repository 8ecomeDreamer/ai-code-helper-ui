<template>
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <!-- 模块标题 -->
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="export" :size="14" />
          <span>文档导出</span>
        </div>
        <h2 class="module-title">对话沉淀为<span class="grad">可交付文档</span></h2>
        <p class="module-sub">选择历史会话，一键导出 Markdown / Word / 网页 三种格式</p>
      </div>

      <!-- 无会话空状态 -->
      <div v-if="!sessions.length" class="empty-card">
        <AppIcon name="file" :size="28" />
        <div class="empty-title">还没有可导出的对话</div>
        <div class="empty-sub">先去智能问答发起一次对话，再回到这里导出文档</div>
      </div>

      <div v-else class="export-panel">
        <!-- 会话选择 -->
        <div class="panel-col session-col">
          <div class="col-title">选择会话（{{ sessions.length }}）</div>
          <div class="session-list scroll-thin">
            <button
              v-for="session in sortedSessions"
              :key="session.id"
              :class="['session-row', { active: session.id === selectedId }]"
              @click="selectedId = session.id"
            >
              <span class="session-radio"></span>
              <span class="session-info">
                <strong :title="session.title">{{ session.title }}</strong>
                <small>{{ session.messages.length }} 条消息 · {{ formatDateTime(session.updatedAt) }}</small>
              </span>
            </button>
          </div>
        </div>

        <!-- 格式与预览 -->
        <div class="panel-col format-col">
          <div class="col-title">导出格式</div>
          <div class="format-grid">
            <button
              v-for="item in formats"
              :key="item.key"
              :class="['format-card', { active: format === item.key }]"
              @click="format = item.key"
            >
              <AppIcon :name="item.icon" :size="17" />
              <strong>{{ item.label }}</strong>
              <small>{{ item.ext }}</small>
            </button>
          </div>

          <div class="col-title preview-title">内容预览</div>
          <pre class="preview-box scroll-thin">{{ previewText }}</pre>

          <div class="export-foot">
            <button class="primary-btn" :disabled="!selectedSession" @click="doExport">
              <AppIcon name="export" :size="15" />
              <span>导出文档</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import {
  formatDateTime,
  exportSessionAs,
  buildSessionMarkdown,
  buildSessionHtml
} from '../utils/index.js'
import { store } from '../store/index.js'

export default {
  name: 'ExportView',
  components: { AppIcon },
  data() {
    return {
      selectedId: null,
      format: 'md',
      formats: [
        { key: 'md', label: 'Markdown', ext: '.md', icon: 'file' },
        { key: 'doc', label: 'Word', ext: '.doc', icon: 'file' },
        { key: 'html', label: '网页', ext: '.html', icon: 'file' }
      ]
    }
  },
  computed: {
    sessions() {
      return store.sessions
    },
    sortedSessions() {
      return [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt)
    },
    selectedSession() {
      return this.sessions.find(session => session.id === this.selectedId) || null
    },
    previewText() {
      if (!this.selectedSession) return '请先选择要导出的会话'
      const content = this.format === 'md'
        ? buildSessionMarkdown(this.selectedSession)
        : buildSessionHtml(this.selectedSession, this.format === 'doc')
      return content.length > 1600 ? `${content.slice(0, 1600)}\n\n...（预览截断，导出为完整内容）` : content
    }
  },
  watch: {
    sortedSessions: {
      immediate: true,
      handler(list) {
        if (!list.some(session => session.id === this.selectedId)) {
          this.selectedId = list.length ? list[0].id : null
        }
      }
    }
  },
  methods: {
    formatDateTime,
    doExport() {
      if (!this.selectedSession) return
      if (!this.selectedSession.messages.length) {
        store.notify('该会话暂无消息内容，无法导出')
        return
      }
      try {
        const filename = exportSessionAs(this.selectedSession, this.format)
        store.notify(`已导出：${filename}`)
      } catch (error) {
        console.error('导出失败:', error)
        store.notify('导出失败，请重试')
      }
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
  max-width: 900px;
  margin: 0 auto;
  padding: 6vh 28px 56px;
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

/* 空状态 */
.empty-card {
  margin-top: 44px;
  padding: 48px 40px;
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--c-text-3);
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text-2);
}

.empty-sub {
  font-size: 12.5px;
}

/* 导出面板 */
.export-panel {
  width: 100%;
  margin-top: 36px;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

.panel-col {
  border-radius: var(--radius-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-md);
  padding: 16px;
}

.col-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-text-2);
  margin-bottom: 10px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 460px;
  overflow-y: auto;
  margin: 0 -4px;
  padding: 0 4px;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  text-align: left;
  transition: background 0.15s ease;
}

.session-row:hover {
  background: var(--c-primary-softer);
}

.session-row.active {
  background: var(--c-primary-soft);
}

.session-radio {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--c-border);
  transition: all 0.15s ease;
}

.session-row.active .session-radio {
  border-color: var(--c-primary);
  background: radial-gradient(circle, var(--c-primary) 0 45%, transparent 50%);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.session-info strong {
  font-size: 13px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-info small {
  font-size: 11px;
  color: var(--c-text-3);
}

/* 格式 */
.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 12px;
  border: 1px solid var(--c-border-soft);
  background: var(--c-primary-softer);
  color: var(--c-text-2);
  transition: all 0.15s ease;
}

.format-card:hover {
  border-color: rgba(47, 84, 150, 0.3);
}

.format-card.active {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary-strong);
  box-shadow: var(--shadow-sm);
}

.format-card strong {
  font-size: 13px;
}

.format-card small {
  font-size: 11px;
  opacity: 0.75;
}

.preview-title {
  margin-top: 16px;
}

.preview-box {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f6f8fb;
  border: 1px solid var(--c-border-soft);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 11.5px;
  line-height: 1.7;
  color: #44506a;
  max-height: 260px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.export-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
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

@media (max-width: 900px) {
  .export-panel {
    grid-template-columns: 1fr;
  }
}
</style>
