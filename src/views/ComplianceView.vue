<template>
  <!-- 合规校验模块：上传/粘贴条款文本，后端大模型深度审查输出校验报告 -->
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="compliance" :size="13" />
          <span>合规校验 · 条款风险体检</span>
        </div>
        <h1 class="module-title">合同条款合规一键校验</h1>
        <p class="module-sub">
          上传或粘贴外贸合同条款，后端大模型深度审查成分标注、贸易术语、检验标准、支付、交期等 10 类必备条款与高风险表述
        </p>
        <span class="demo-tag">
          <AppIcon name="bulb" :size="12" />
          大模型深度审查（txt/md/pdf）· Reflection Agent 逐层反思
        </span>
      </div>

      <div class="check-grid">
        <!-- 左侧：条款输入 -->
        <section class="panel">
          <div class="panel-head">
            <AppIcon name="file" :size="14" />
            <strong>条款文本</strong>
            <span class="head-actions">
              <button class="ghost-btn" title="载入完备示范条款" @click="loadSample('good')">完备样例</button>
              <button class="ghost-btn warn" title="载入风险示范条款" @click="loadSample('risky')">风险样例</button>
            </span>
          </div>

          <div class="form-body">
            <!-- 文件上传（txt / md 直接读取文本；pdf 由后端解析） -->
            <div
              :class="['dropzone', { dragover }]"
              @click="$refs.fileRef.click()"
              @dragover.prevent="dragover = true"
              @dragleave.prevent="dragover = false"
              @drop.prevent="onDrop"
            >
              <AppIcon name="upload" :size="18" />
              <span>{{ fileName ? '点击或拖拽可重新选择文件' : '点击上传或拖拽 .txt / .md / .pdf 条款文件到此处' }}</span>
              <input ref="fileRef" type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" hidden @change="onFileChange" />
            </div>

            <!-- 已上传文件卡片 -->
            <div v-if="uploadedFile" class="file-card">
              <AppIcon name="file" :size="18" />
              <div class="file-card-info">
                <strong>{{ uploadedFile.name }}</strong>
                <small>{{ formatFileSize(uploadedFile.size) }} · {{ fileExt }}</small>
              </div>
              <button class="file-card-remove" title="移除文件" @click="clearFile">
                <AppIcon name="x" :size="14" />
              </button>
            </div>

            <!-- 文本预览（只读，当文件已上传时展示文件内容） -->
            <textarea
              v-if="uploadedFile && clauseText"
              :value="clauseText"
              class="clause-input scroll-thin readonly"
              rows="12"
              readonly
            />

            <!-- 文本输入（无文件时可编辑） -->
            <textarea
              v-else-if="!uploadedFile"
              v-model="clauseText"
              class="clause-input scroll-thin"
              rows="16"
              placeholder="也可直接粘贴合同条款文本..."
            />

            <div class="action-row">
              <span class="char-count">{{ uploadedFile ? '文件模式' : clauseText.length + ' 字' }}</span>
              <button v-if="!uploadedFile" class="ghost-btn" :disabled="!clauseText" @click="clauseText = ''">清空</button>
              <button class="primary-btn" :disabled="checking || (!clauseText.trim() && !uploadedFile)" @click="runCheck">
                <AppIcon name="compliance" :size="14" />
                <span>{{ checking ? '校验中...' : '开始校验' }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 右侧：校验报告 -->
        <section class="panel">
          <div class="panel-head">
            <AppIcon name="tasks" :size="14" />
            <strong>校验报告</strong>
            <span v-if="report" class="head-actions">
              <button class="ghost-btn" title="复制报告摘要" @click="copySummary">
                <AppIcon name="copy" :size="13" />
                <span>复制摘要</span>
              </button>
            </span>
          </div>

          <div v-if="checking" class="report-empty">
            <LoadingDots />
            <p>大模型审查中...</p>
          </div>

          <div v-else-if="report" class="report-body">
            <!-- 结论横幅 -->
            <div :class="['verdict', report.summary.verdict]">
              <AppIcon :name="verdictIcon" :size="20" />
              <div class="verdict-text">
                <strong>{{ verdictLabel }}</strong>
                <p>{{ report.summary.verdictText }}</p>
              </div>
              <div class="verdict-score">
                <strong>{{ report.summary.passed }}/{{ report.summary.total }}</strong>
                <small>必备条款通过</small>
              </div>
            </div>

            <!-- 风险表述 -->
            <div v-if="report.risks.length" class="section">
              <div class="section-head risk">
                <AppIcon name="x" :size="13" />
                <span>高风险表述（{{ report.risks.length }}）</span>
              </div>
              <div v-for="risk in report.risks" :key="risk.id" class="risk-card">
                <strong>{{ risk.name }}</strong>
                <div class="risk-hits">
                  <code v-for="(hit, i) in risk.hits" :key="i">「{{ hit }}」</code>
                </div>
                <p>{{ risk.advice }}</p>
              </div>
            </div>

            <!-- 条款检查明细 -->
            <div class="section">
              <div class="section-head">
                <AppIcon name="tasks" :size="13" />
                <span>条款检查明细</span>
              </div>
              <div v-for="item in report.items" :key="item.id" :class="['check-item', { passed: item.passed }]">
                <span :class="['check-flag', item.passed ? 'ok' : item.level]">
                  <AppIcon :name="item.passed ? 'check' : (item.level === 'info' ? 'bulb' : 'x')" :size="12" />
                </span>
                <div class="check-text">
                  <strong>
                    {{ item.name }}
                    <em :class="['level-tag', item.level]">{{ levelLabel(item) }}</em>
                  </strong>
                  <p>{{ item.detail }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="report-empty">
            <AppIcon name="compliance" :size="30" />
            <p>输入条款文本后点击「开始校验」<br /><small>可先载入样例体验校验能力</small></p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import LoadingDots from '../components/LoadingDots.vue'
import { store } from '../store/index.js'
import { SAMPLE_CLAUSES } from '../utils/compliance.js'
import { checkComplianceDoc } from '../api/bizApi.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB（兼容 pdf）
const PDF_EXT = /\.pdf$/i

export default {
  name: 'ComplianceView',
  components: { AppIcon, LoadingDots },
  data() {
    return {
      clauseText: '',
      checking: false,
      dragover: false,
      report: null,
      uploadedFile: null,
      fileName: ''
    }
  },
  computed: {
    verdictIcon() {
      if (!this.report) return 'file'
      const map = { pass: 'check', review: 'bulb', reject: 'x' }
      return map[this.report.summary.verdict] || 'file'
    },
    verdictLabel() {
      if (!this.report) return ''
      const map = { pass: '校验通过', review: '建议复核', reject: '存在高风险' }
      return map[this.report.summary.verdict] || ''
    },
    fileExt() {
      if (!this.uploadedFile) return ''
      const name = this.uploadedFile.name || ''
      const dot = name.lastIndexOf('.')
      return dot > 0 ? name.slice(dot + 1).toUpperCase() : ''
    }
  },
  methods: {
    levelLabel(item) {
      if (item.passed) return '已通过'
      const map = { error: '高风险缺失', warn: '建议补充', info: '可选完善' }
      return map[item.level] || ''
    },
    formatFileSize(size) {
      if (!size) return ''
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
      return `${(size / 1024 / 1024).toFixed(1)} MB`
    },
    clearFile() {
      this.uploadedFile = null
      this.fileName = ''
      this.clauseText = ''
      this.report = null
    },
    loadSample(type) {
      this.clauseText = SAMPLE_CLAUSES[type] || ''
      this.report = null
      this.uploadedFile = null
      this.fileName = ''
      store.notify(type === 'good' ? '已载入完备示范条款' : '已载入风险示范条款')
    },
    onFileChange(event) {
      const file = event.target.files && event.target.files[0]
      if (file) this.readFile(file)
      event.target.value = ''
    },
    onDrop(event) {
      this.dragover = false
      const file = event.dataTransfer.files && event.dataTransfer.files[0]
      if (file) this.readFile(file)
    },
    readFile(file) {
      if (file.size > MAX_FILE_SIZE) {
        store.notify('文件超过 5MB，请拆分条款后重试')
        return
      }
      // pdf 无法在浏览器端直读文本，交由后端解析，仅保留文件引用
      if (PDF_EXT.test(file.name)) {
        this.uploadedFile = file
        this.fileName = file.name
        this.clauseText = ''
        this.report = null
        store.notify(`已选择 PDF：${file.name}，将由后端解析审查`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        this.clauseText = String(reader.result || '')
        this.uploadedFile = file
        this.fileName = file.name
        this.report = null
        store.notify(`已读取：${file.name}`)
      }
      reader.onerror = () => store.notify('文件读取失败，请改用粘贴方式', 'error')
      reader.readAsText(file, 'utf-8')
    },
    async runCheck() {
      if ((!this.clauseText.trim() && !this.uploadedFile) || this.checking) return
      this.checking = true
      this.report = null
      try {
        // 后端大模型深度审查（支持 txt/md/pdf）
        const payload = {
          file: this.uploadedFile || undefined,
          text: this.clauseText.trim() || undefined
        }
        const data = await checkComplianceDoc(payload)
        if (data && data.summary && Array.isArray(data.items)) {
          this.report = data
          store.notify('大模型合规审查完成')
        } else {
          store.notify('合规审查未返回有效结果，请重试', 'error')
        }
      } catch (error) {
        console.error('合规审查失败:', error)
        store.notify('合规审查服务异常：' + (error.message || '请稍后重试'), 'error')
      } finally {
        this.checking = false
      }
    },
    async copySummary() {
      if (!this.report) return
      const s = this.report.summary
      const text = [
        `【合规校验报告】${this.verdictLabel}`,
        s.verdictText,
        `必备条款：${s.passed}/${s.total} 通过（高风险缺失 ${s.missingError}、建议补充 ${s.missingWarn}、可选完善 ${s.missingInfo}）`,
        `高风险表述：${s.riskCount} 处`,
        '',
        ...this.report.risks.map(risk => `⚠ ${risk.name}：${risk.advice}`),
        ...this.report.items.filter(item => !item.passed).map(item => `✗ ${item.name}：${item.detail}`)
      ].join('\n')
      try {
        await navigator.clipboard.writeText(text)
        store.notify('报告摘要已复制到剪贴板')
      } catch (error) {
        store.notify('复制失败，请手动选择文本复制')
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
  max-width: 1060px;
  margin: 0 auto;
  padding: 44px 28px 56px;
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
  font-size: clamp(24px, 3.4vw, 32px);
  font-weight: 800;
  color: var(--c-text);
}

.module-sub {
  margin: 12px 0 0;
  max-width: 640px;
  font-size: 13.5px;
  color: var(--c-text-2);
  text-align: center;
  line-height: 1.7;
}

.demo-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-accent);
  background: rgba(194, 106, 74, 0.08);
  border: 1px dashed rgba(194, 106, 74, 0.4);
}

.check-grid {
  width: 100%;
  margin-top: 30px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.panel {
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 18px;
  font-size: 13.5px;
  color: var(--c-primary);
  background: linear-gradient(180deg, #fbfcfe, #f6f8fc);
  border-bottom: 1px solid var(--c-border-soft);
}

.panel-head strong {
  color: var(--c-text);
}

.head-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-text-2);
  background: #fff;
  border: 1px solid var(--c-border);
  transition: all 0.15s ease;
}

.ghost-btn:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.35);
}

.ghost-btn.warn:hover:not(:disabled) {
  color: var(--c-accent);
  border-color: rgba(194, 106, 74, 0.4);
}

.ghost-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1.5px dashed var(--c-border);
  background: var(--c-primary-softer);
  font-size: 12.5px;
  color: var(--c-text-3);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropzone:hover,
.dropzone.dragover {
  border-color: rgba(47, 84, 150, 0.45);
  color: var(--c-primary);
  background: var(--c-primary-soft);
}

.clause-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--c-border);
  background: #fff;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--c-text);
  outline: none;
  resize: vertical;
  min-height: 220px;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.clause-input:focus {
  border-color: rgba(47, 84, 150, 0.45);
  box-shadow: 0 0 0 3px rgba(47, 84, 150, 0.1);
}

.clause-input.readonly {
  background: #f9fafb;
  color: var(--c-text-2);
  cursor: default;
  border-style: dashed;
}

/* 已上传文件卡片 */
.file-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.18);
}

.file-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-card-info strong {
  font-size: 12.5px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card-info small {
  font-size: 11px;
  color: var(--c-text-3);
}

.file-card-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-3);
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.file-card-remove:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.char-count {
  margin-right: auto;
  font-size: 11.5px;
  color: var(--c-text-3);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 4px 12px rgba(47, 84, 150, 0.3);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.primary-btn:disabled {
  opacity: 0.4;
  box-shadow: none;
  cursor: not-allowed;
}

/* 报告 */
.report-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 640px;
  overflow-y: auto;
}

.verdict {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
}

.verdict.pass {
  color: #2e7d52;
  background: rgba(58, 125, 93, 0.08);
  border: 1px solid rgba(58, 125, 93, 0.25);
}

.verdict.review {
  color: var(--c-accent);
  background: rgba(194, 106, 74, 0.07);
  border: 1px solid rgba(194, 106, 74, 0.3);
}

.verdict.reject {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.06);
  border: 1px solid rgba(192, 57, 43, 0.25);
}

.verdict-text {
  flex: 1;
  min-width: 0;
}

.verdict-text strong {
  font-size: 14.5px;
}

.verdict-text p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.9;
}

.verdict-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.verdict-score strong {
  font-size: 19px;
}

.verdict-score small {
  font-size: 10.5px;
  opacity: 0.8;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--c-text-2);
  margin-bottom: 10px;
}

.section-head.risk {
  color: #c0392b;
}

.risk-card {
  padding: 11px 14px;
  border-radius: 12px;
  background: rgba(192, 57, 43, 0.04);
  border: 1px solid rgba(192, 57, 43, 0.18);
  margin-bottom: 8px;
}

.risk-card strong {
  font-size: 12.5px;
  color: #c0392b;
}

.risk-hits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
}

.risk-hits code {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  color: #a13228;
  background: rgba(192, 57, 43, 0.08);
}

.risk-card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--c-text-2);
}

.check-item {
  display: flex;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 11px;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid transparent;
}

.check-item:not(.passed) {
  background: rgba(194, 106, 74, 0.04);
  border-color: rgba(194, 106, 74, 0.15);
}

.check-flag {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: #fff;
}

.check-flag.ok {
  background: #3a7d5d;
}

.check-flag.error {
  background: #c0392b;
}

.check-flag.warn {
  background: var(--c-accent);
}

.check-flag.info {
  background: #8a94a6;
}

.check-text {
  min-width: 0;
}

.check-text strong {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--c-text);
}

.level-tag {
  font-style: normal;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
}

.level-tag.error,
.check-item:not(.passed) .level-tag.error {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

.level-tag.warn {
  color: var(--c-accent);
  background: rgba(194, 106, 74, 0.1);
}

.level-tag.info {
  color: #5d6b84;
  background: rgba(0, 0, 0, 0.05);
}

.check-item.passed .level-tag {
  color: #2e7d52;
  background: rgba(58, 125, 93, 0.1);
}

.check-text p {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--c-text-2);
}

.report-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--c-text-3);
  text-align: center;
}

.report-empty p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.9;
}

@media (max-width: 900px) {
  .check-grid {
    grid-template-columns: 1fr;
  }
}
</style>
