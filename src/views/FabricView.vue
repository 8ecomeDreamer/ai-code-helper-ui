<template>
  <!-- 面料识别模块：上传图片检测疵点（CV 模型待后端，前端提供上传与报告结构） -->
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="fabric" :size="13" />
          <span>面料识别 · 疵点检测</span>
        </div>
        <h1 class="module-title">面料疵点智能检测</h1>
        <p class="module-sub">
          上传面料实物图片，自动检测断纬、油污、色差、破洞、竹节纱等常见疵点，输出定位与等级评定报告
        </p>
        <span class="demo-tag">
          <AppIcon name="bulb" :size="12" />
          疵点检测依赖 CV 模型 · 待后端对接（/api/fabric/defect/detect）
        </span>
      </div>

      <div class="fabric-grid">
        <!-- 左侧：上传区 -->
        <section class="panel">
          <div class="panel-head">
            <AppIcon name="image" :size="14" />
            <strong>面料图片</strong>
            <span v-if="previewUrl" class="head-actions">
              <button class="ghost-btn" @click="removeFile">
                <AppIcon name="trash" :size="13" />
                <span>移除</span>
              </button>
            </span>
          </div>

          <div class="form-body">
            <div
              v-if="!previewUrl"
              :class="['dropzone', { dragover }]"
              @click="$refs.fileRef.click()"
              @dragover.prevent="dragover = true"
              @dragleave.prevent="dragover = false"
              @drop.prevent="onDrop"
            >
              <span class="drop-icon">
                <AppIcon name="upload" :size="22" />
              </span>
              <strong>点击上传或拖拽面料图片到此处</strong>
              <small>支持 JPG / PNG，建议拍摄平整布面，单张不超过 10MB</small>
              <input ref="fileRef" type="file" accept="image/*" hidden @change="onFileChange" />
            </div>

            <div v-else class="preview-wrap">
              <img :src="previewUrl" class="preview-img" alt="面料预览" />
              <div class="preview-meta">
                <span>{{ file ? file.name : '' }}</span>
                <small>{{ file ? (file.size / 1024).toFixed(0) + ' KB' : '' }}</small>
              </div>
            </div>

            <button class="primary-btn" :disabled="!file || detecting" @click="detect">
              <AppIcon name="fabric" :size="15" />
              <span>{{ detecting ? '检测中...' : '开始疵点检测' }}</span>
            </button>

            <!-- 检测结果 -->
            <div v-if="result" :class="['detect-result', result.status]">
              <div class="result-head">
                <AppIcon :name="result.status === 'done' ? 'check' : 'bulb'" :size="14" />
                <strong>{{ result.title }}</strong>
              </div>
              <p>{{ result.message }}</p>
              <template v-if="result.report">
                <div class="defect-list">
                  <div v-for="defect in result.report.defects" :key="defect.name" class="defect-item">
                    <span :class="['defect-dot', defect.grade]"></span>
                    <strong>{{ defect.name }}</strong>
                    <em>{{ defect.position }}</em>
                    <small :class="defect.grade">{{ gradeLabel(defect.grade) }}</small>
                  </div>
                </div>
                <div class="result-foot">
                  综合评定：<strong>{{ result.report.verdict }}</strong>
                </div>
              </template>
            </div>
          </div>
        </section>

        <!-- 右侧：能力说明与演示报告 -->
        <section class="panel">
          <div class="panel-head">
            <AppIcon name="layers" :size="14" />
            <strong>检测能力说明</strong>
          </div>
          <div class="ability-body">
            <div class="ability-grid">
              <div v-for="ability in abilities" :key="ability.name" class="ability-card">
                <span class="ability-icon" :style="{ color: ability.color, background: ability.bg }">
                  <AppIcon :name="ability.icon" :size="15" />
                </span>
                <strong>{{ ability.name }}</strong>
                <small>{{ ability.desc }}</small>
              </div>
            </div>

            <div class="sample-report">
              <div class="sample-head">
                <AppIcon name="file" :size="13" />
                <span>演示报告样例（后端模型就绪后按此结构输出）</span>
              </div>
              <pre class="sample-code scroll-thin">{{ sampleReport }}</pre>
            </div>

            <div class="backend-note">
              <AppIcon name="flow" :size="14" />
              <div>
                <strong>后端对接待办</strong>
                <p>
                  1. 提供疵点检测接口 POST /api/fabric/defect/detect（multipart 图片）；<br />
                  2. 返回 JSON：defects[{ name, position, grade }] + verdict；<br />
                  3. 前端已按此契约预留 detect() 调用位，接口就绪后替换演示逻辑即可。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import { store } from '../store/index.js'

const MAX_SIZE = 10 * 1024 * 1024

export default {
  name: 'FabricView',
  components: { AppIcon },
  data() {
    return {
      file: null,
      previewUrl: '',
      dragover: false,
      detecting: false,
      result: null,
      abilities: [
        { name: '断纬 / 断经', desc: '纬向或经向纱线断裂形成的横向/纵向细线疵点', icon: 'trace', color: '#c0392b', bg: 'rgba(192,57,43,0.08)' },
        { name: '油污 / 渍痕', desc: '织造或储运过程沾染的油渍、锈渍等异色斑块', icon: 'bulb', color: '#c26a4a', bg: 'rgba(194,106,74,0.1)' },
        { name: '色差 / 色花', desc: '染色不均导致的左中右色差或云斑状色花', icon: 'layers', color: '#2f5496', bg: 'rgba(47,84,150,0.1)' },
        { name: '破洞 / 稀密路', desc: '布面破洞、裂口及纬密不均形成的稀密路档', icon: 'grid', color: '#3a7d5d', bg: 'rgba(58,125,93,0.1)' },
        { name: '竹节纱 / 棉结', desc: '纱线条干不匀形成的竹节状粗节与棉结杂质', icon: 'sparkle', color: '#7a5ea8', bg: 'rgba(122,94,168,0.1)' },
        { name: '等级评定', desc: '按四分制对疵点评分，输出 A/B/C 级综合评定', icon: 'check', color: '#5d6b84', bg: 'rgba(93,107,132,0.1)' }
      ],
      sampleReport: `{
  "defects": [
    { "name": "断纬", "position": "左中部 (x:120, y:340)", "grade": "B" },
    { "name": "油污", "position": "右上区 (x:560, y:80)",  "grade": "C" }
  ],
  "verdict": "B 级品 · 建议降级处理或修复后复检"
}`
    }
  },
  methods: {
    gradeLabel(grade) {
      const map = { A: '轻微', B: '中等', C: '严重' }
      return `${grade} 级 · ${map[grade] || ''}`
    },
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
      this.result = null
    },
    removeFile() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
      }
      this.file = null
      this.previewUrl = ''
      this.result = null
    },
    async detect() {
      if (!this.file || this.detecting) return
      this.detecting = true
      this.result = null
      try {
        // TODO: 后端对接 - axios.post('/api/fabric/defect/detect', formData)
        // CV 疵点检测模型未就绪，先返回演示报告展示目标输出结构
        await new Promise(resolve => setTimeout(resolve, 800))
        this.result = {
          status: 'demo',
          title: '演示报告（检测模型待后端对接）',
          message: '疵点检测依赖 CV 视觉模型，当前后端接口未就绪。以下为演示输出，接口对接后将返回真实检测结果。',
          report: {
            defects: [
              { name: '断纬', position: '左中部 (x:120, y:340)', grade: 'B' },
              { name: '油污', position: '右上区 (x:560, y:80)', grade: 'C' }
            ],
            verdict: 'B 级品 · 建议降级处理或修复后复检'
          }
        }
        store.notify('已生成演示检测报告，真实检测待后端对接')
      } finally {
        this.detecting = false
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

.fabric-grid {
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

.ghost-btn:hover {
  color: #c0392b;
  border-color: rgba(192, 57, 43, 0.35);
}

.form-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  border-radius: 14px;
  border: 1.5px dashed var(--c-border);
  background: var(--c-primary-softer);
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropzone:hover,
.dropzone.dragover {
  border-color: rgba(47, 84, 150, 0.45);
  background: var(--c-primary-soft);
}

.drop-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-primary);
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.dropzone strong {
  font-size: 13px;
  color: var(--c-text);
}

.dropzone small {
  font-size: 11.5px;
  color: var(--c-text-3);
}

.preview-wrap {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--c-border-soft);
  background: #fff;
}

.preview-img {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  background: repeating-conic-gradient(#f2f4f8 0% 25%, #fff 0% 50%) 50% / 16px 16px;
}

.preview-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 13px;
  font-size: 12px;
  color: var(--c-text-2);
  border-top: 1px solid var(--c-border-soft);
}

.preview-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta small {
  color: var(--c-text-3);
  flex-shrink: 0;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 6px 16px rgba(47, 84, 150, 0.3);
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

/* 检测结果 */
.detect-result {
  padding: 13px 15px;
  border-radius: 13px;
  font-size: 12.5px;
}

.detect-result.demo {
  background: rgba(194, 106, 74, 0.05);
  border: 1px dashed rgba(194, 106, 74, 0.35);
}

.detect-result.done {
  background: rgba(58, 125, 93, 0.05);
  border: 1px solid rgba(58, 125, 93, 0.25);
}

.result-head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--c-accent);
}

.detect-result.done .result-head {
  color: #2e7d52;
}

.result-head strong {
  font-size: 13px;
}

.detect-result > p {
  margin: 7px 0 0;
  line-height: 1.7;
  color: var(--c-text-2);
}

.defect-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.defect-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--c-border-soft);
  font-size: 12px;
}

.defect-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.defect-dot.A {
  background: #3a7d5d;
}

.defect-dot.B {
  background: var(--c-accent);
}

.defect-dot.C {
  background: #c0392b;
}

.defect-item strong {
  color: var(--c-text);
}

.defect-item em {
  font-style: normal;
  color: var(--c-text-3);
  font-size: 11px;
}

.defect-item small {
  margin-left: auto;
  font-weight: 600;
  flex-shrink: 0;
}

.defect-item small.A {
  color: #2e7d52;
}

.defect-item small.B {
  color: var(--c-accent);
}

.defect-item small.C {
  color: #c0392b;
}

.result-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-2);
}

.result-foot strong {
  color: var(--c-accent);
}

/* 右侧说明 */
.ability-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ability-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ability-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 13px;
  border-radius: 12px;
  background: linear-gradient(150deg, #fbfcfe, #f6f4ee);
  border: 1px solid var(--c-border-soft);
}

.ability-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ability-card strong {
  font-size: 12.5px;
  color: var(--c-text);
}

.ability-card small {
  font-size: 11px;
  line-height: 1.6;
  color: var(--c-text-3);
}

.sample-report {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--c-border-soft);
}

.sample-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--c-text-2);
  background: #f4f8fc;
  border-bottom: 1px solid var(--c-border-soft);
}

.sample-code {
  margin: 0;
  padding: 13px 15px;
  font-size: 11.5px;
  line-height: 1.7;
  font-family: Consolas, 'Courier New', monospace;
  color: #d5deeb;
  background: #212836;
  overflow-x: auto;
}

.backend-note {
  display: flex;
  gap: 11px;
  padding: 13px 15px;
  border-radius: 12px;
  background: rgba(47, 84, 150, 0.05);
  border: 1px solid rgba(47, 84, 150, 0.15);
  color: var(--c-primary);
}

.backend-note strong {
  font-size: 12.5px;
  color: var(--c-text);
}

.backend-note p {
  margin: 5px 0 0;
  font-size: 11.5px;
  line-height: 1.9;
  color: var(--c-text-2);
}

@media (max-width: 900px) {
  .fabric-grid {
    grid-template-columns: 1fr;
  }

  .ability-grid {
    grid-template-columns: 1fr;
  }
}
</style>
