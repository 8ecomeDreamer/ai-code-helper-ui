<template>
  <!-- 智能报价模块：ERP 面料成本 -> 报价计算 -> 多语言邮件生成 -> md/pdf 导出 -->
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="quote" :size="13" />
          <span>智能报价 · ERP 成本驱动</span>
        </div>
        <h1 class="module-title">一键生成多语言报价邮件</h1>
        <p class="module-sub">
          调用 ERP 面料成本数据，自动完成利润加成与数量折扣计算，生成中 / 英 / 双语报价邮件，支持 Markdown 与 PDF 导出
        </p>
        <span class="demo-tag">
          <AppIcon name="bulb" :size="12" />
          ERP 演示数据 · 待后端对接真实成本接口
        </span>
      </div>

      <div class="quote-grid">
        <!-- 左侧：报价参数表单 -->
        <section class="panel form-panel">
          <div class="panel-head">
            <AppIcon name="settings" :size="14" />
            <strong>报价参数</strong>
          </div>

          <div class="form-body">
            <label class="field">
              <span class="field-label">客户称呼</span>
              <input v-model.trim="form.customer" type="text" placeholder="如：Mr. Smith / 张经理（可选）" />
            </label>

            <label class="field">
              <span class="field-label">面料（ERP 数据）</span>
              <select v-model="form.fabricCode">
                <option v-for="item in fabrics" :key="item.code" :value="item.code">
                  {{ item.name }} · {{ item.code }}
                </option>
              </select>
            </label>

            <!-- 选中面料的 ERP 成本明细 -->
            <div v-if="selectedFabric" class="erp-card">
              <div class="erp-row"><span>规格</span><strong>{{ selectedFabric.spec }}</strong></div>
              <div class="erp-row"><span>克重 / 幅宽</span><strong>{{ selectedFabric.weight }} / {{ selectedFabric.width }}</strong></div>
              <div class="erp-row">
                <span>成本构成（元/米）</span>
                <strong>
                  原料 {{ selectedFabric.cost.material }} · 织造 {{ selectedFabric.cost.process }} ·
                  染整 {{ selectedFabric.cost.dyeing }} · 检测 {{ selectedFabric.cost.test }} ·
                  包装 {{ selectedFabric.cost.packing }}
                </strong>
              </div>
              <div class="erp-row"><span>MOQ / 交期</span><strong>{{ selectedFabric.moq.toLocaleString() }} 米 / {{ selectedFabric.leadTime }} 天</strong></div>
            </div>

            <div class="field-row">
              <label class="field">
                <span class="field-label">数量（米）</span>
                <input v-model.number="form.quantity" type="number" min="100" step="100" />
              </label>
              <label class="field">
                <span class="field-label">利润率（%）</span>
                <input v-model.number="form.marginPct" type="number" min="0" max="100" step="1" />
              </label>
            </div>

            <div class="field-row">
              <label class="field">
                <span class="field-label">结算币种</span>
                <select v-model="form.currency">
                  <option v-for="c in currencies" :key="c.code" :value="c.code">{{ c.label }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">贸易术语</span>
                <select v-model="form.tradeTerm">
                  <option v-for="t in tradeTerms" :key="t" :value="t">{{ t }}</option>
                </select>
              </label>
            </div>

            <label class="field">
              <span class="field-label">邮件语言</span>
              <div class="lang-group">
                <button
                  v-for="l in languages"
                  :key="l.code"
                  :class="['lang-btn', { active: form.lang === l.code }]"
                  type="button"
                  @click="form.lang = l.code"
                >
                  {{ l.label }}
                </button>
              </div>
            </label>

            <button class="primary-btn" type="button" @click="generate">
              <AppIcon name="sparkle" :size="15" />
              <span>生成报价邮件</span>
            </button>
          </div>
        </section>

        <!-- 右侧：报价结果与邮件预览 -->
        <section class="panel result-panel">
          <div class="panel-head">
            <AppIcon name="file" :size="14" />
            <strong>邮件预览</strong>
            <span v-if="quote" class="head-actions">
              <button class="ghost-btn" title="下载 Markdown 文件" @click="exportMd">
                <AppIcon name="export" :size="13" />
                <span>导出 MD</span>
              </button>
              <button class="ghost-btn" title="打开打印窗口，另存为 PDF" @click="exportPdf">
                <AppIcon name="file" :size="13" />
                <span>导出 PDF</span>
              </button>
            </span>
          </div>

          <div v-if="quote" class="result-body">
            <!-- 报价摘要 -->
            <div class="quote-summary">
              <div class="sum-item">
                <small>单价</small>
                <strong>{{ formatMoney(quote.unitPrice, quote.symbol) }}<i>/米</i></strong>
              </div>
              <div class="sum-item">
                <small>总金额</small>
                <strong>{{ formatMoney(quote.totalAmount, quote.symbol) }}</strong>
              </div>
              <div class="sum-item">
                <small>利润率</small>
                <strong>{{ quote.marginPct }}%</strong>
              </div>
              <div class="sum-item">
                <small>数量折扣</small>
                <strong>{{ quote.discountPct > 0 ? `-${quote.discountPct}%` : '无' }}</strong>
              </div>
            </div>
            <p v-if="quote.belowMoq" class="moq-warn">
              <AppIcon name="bulb" :size="12" />
              当前数量低于 MOQ（{{ quote.moq.toLocaleString() }} 米），邮件中已自动附加提示
            </p>

            <!-- 邮件正文预览（Markdown 渲染） -->
            <div class="email-preview markdown-body" v-html="emailHtml" />
          </div>

          <div v-else class="result-empty">
            <AppIcon name="quote" :size="30" />
            <p>选择面料并填写参数后<br />点击「生成报价邮件」预览效果</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import { renderMarkdown } from '../utils/markdown.js'
import { store } from '../store/index.js'
import {
  fetchErpFabrics,
  computeQuote,
  buildQuoteEmail,
  formatMoney,
  exportQuoteMarkdown,
  printQuotePdf,
  CURRENCIES,
  TRADE_TERMS,
  EMAIL_LANGUAGES
} from '../utils/quote.js'

export default {
  name: 'QuoteView',
  components: { AppIcon },
  data() {
    return {
      fabrics: [],
      currencies: CURRENCIES,
      tradeTerms: TRADE_TERMS,
      languages: EMAIL_LANGUAGES,
      form: {
        customer: '',
        fabricCode: '',
        quantity: 3000,
        marginPct: 15,
        currency: 'USD',
        tradeTerm: TRADE_TERMS[0],
        lang: 'both'
      },
      quote: null,
      emailMarkdown: ''
    }
  },
  computed: {
    selectedFabric() {
      return this.fabrics.find(item => item.code === this.form.fabricCode) || null
    },
    emailHtml() {
      return renderMarkdown(this.emailMarkdown || '')
    }
  },
  methods: {
    formatMoney,
    async loadFabrics() {
      this.fabrics = await fetchErpFabrics()
      if (this.fabrics.length && !this.form.fabricCode) {
        this.form.fabricCode = this.fabrics[0].code
      }
    },
    generate() {
      const fabric = this.selectedFabric
      if (!fabric) {
        store.notify('请先选择面料', 'error')
        return
      }
      if (!this.form.quantity || this.form.quantity < 100) {
        store.notify('请填写有效的数量（不少于 100 米）', 'error')
        return
      }
      this.quote = computeQuote({
        fabric,
        quantity: this.form.quantity,
        marginPct: Number(this.form.marginPct) || 0,
        currency: this.form.currency,
        tradeTerm: this.form.tradeTerm
      })
      this.emailMarkdown = buildQuoteEmail(this.quote, this.form.lang, this.form.customer)
      store.notify('报价邮件已生成')
    },
    exportMd() {
      try {
        const filename = exportQuoteMarkdown(this.quote, this.emailMarkdown)
        store.notify(`已导出：${filename}`)
      } catch (error) {
        console.error('导出 Markdown 失败:', error)
        store.notify('导出失败，请重试', 'error')
      }
    },
    exportPdf() {
      const ok = printQuotePdf(this.quote, this.emailHtml)
      store.notify(ok ? '已打开打印窗口，选择「另存为 PDF」即可' : '浏览器拦截了打印窗口，请允许弹出后重试', ok ? 'info' : 'error')
    }
  },
  mounted() {
    this.loadFabrics()
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

/* 布局 */
.quote-grid {
  width: 100%;
  margin-top: 30px;
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
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

.ghost-btn:hover {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.35);
}

/* 表单 */
.form-body {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-2);
}

.field input,
.field select {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--c-border);
  background: #fff;
  font-size: 13px;
  color: var(--c-text);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field input:focus,
.field select:focus {
  border-color: rgba(47, 84, 150, 0.45);
  box-shadow: 0 0 0 3px rgba(47, 84, 150, 0.1);
}

.field-row {
  display: flex;
  gap: 12px;
}

/* ERP 成本卡片 */
.erp-card {
  padding: 10px 13px;
  border-radius: 12px;
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.14);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.erp-row {
  display: flex;
  gap: 10px;
  font-size: 11.5px;
  line-height: 1.6;
}

.erp-row > span {
  flex-shrink: 0;
  width: 96px;
  color: var(--c-text-3);
}

.erp-row strong {
  color: var(--c-text-2);
  font-weight: 600;
}

/* 语言选择 */
.lang-group {
  display: flex;
  gap: 8px;
}

.lang-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--c-text-2);
  background: #fff;
  border: 1px solid var(--c-border);
  transition: all 0.15s ease;
}

.lang-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(47, 84, 150, 0.25);
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
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(47, 84, 150, 0.35);
}

/* 结果区 */
.result-body {
  padding: 16px 18px 20px;
}

.quote-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.sum-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(150deg, #eef3fb, #f7f4ec);
  border: 1px solid rgba(47, 84, 150, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum-item small {
  font-size: 11px;
  color: var(--c-text-3);
}

.sum-item strong {
  font-size: 16px;
  color: var(--c-primary-strong);
}

.sum-item strong i {
  font-style: normal;
  font-size: 11px;
  color: var(--c-text-3);
  margin-left: 2px;
}

.moq-warn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 12px;
  color: var(--c-accent);
  background: rgba(194, 106, 74, 0.07);
  border: 1px dashed rgba(194, 106, 74, 0.35);
}

.email-preview {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--c-border-soft);
  max-height: 480px;
  overflow-y: auto;
}

.result-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 70px 20px;
  color: var(--c-text-3);
  text-align: center;
}

.result-empty p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
}

@media (max-width: 900px) {
  .quote-grid {
    grid-template-columns: 1fr;
  }

  .quote-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
