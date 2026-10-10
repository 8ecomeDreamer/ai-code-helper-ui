<template>
  <!-- 竞品调研模块：输入面料关键词，聚合外部平台同类价格与信息 -->
  <div class="module-view scroll-thin">
    <div class="module-inner">
      <div class="module-hero">
        <div class="module-badge">
          <AppIcon name="research" :size="13" />
          <span>竞品调研 · 全网比价</span>
        </div>
        <h1 class="module-title">面料竞品行情一键调研</h1>
        <p class="module-sub">
          输入面料名称，自动聚合阿里国际站、Made-in-China、全球纺织网等平台的同类价格、起订量与交期信息，生成对比分析报告
        </p>
        <span class="demo-tag">
          <AppIcon name="bulb" :size="12" />
          演示数据 · 真实全网抓取待后端对接（/api/research/fabric）
        </span>
      </div>

      <!-- 搜索区 -->
      <div class="search-panel">
        <div class="search-row">
          <AppIcon name="search" :size="16" class="search-icon" />
          <input
            v-model.trim="keyword"
            type="text"
            placeholder="输入面料名称，如：全棉府绸 / 涤棉纱卡 / 春亚纺 / 弹力牛仔布"
            @keydown.enter="search"
          />
          <button class="search-btn" :disabled="searching || !keyword" @click="search">
            <AppIcon name="search" :size="14" />
            <span>{{ searching ? '调研中...' : '开始调研' }}</span>
          </button>
        </div>
        <div class="hot-row">
          <span class="hot-label">热门面料：</span>
          <button v-for="kw in hotKeywords" :key="kw" class="hot-chip" @click="pickKeyword(kw)">
            {{ kw }}
          </button>
        </div>
      </div>

      <!-- 调研结果 -->
      <div v-if="searching" class="state-card">
        <LoadingDots />
        <p>正在检索各平台竞品行情...</p>
      </div>

      <div v-else-if="notFound" class="state-card">
        <AppIcon name="x" :size="26" />
        <p>
          未找到「{{ lastKeyword }}」的竞品数据<br />
          <small>演示数据暂覆盖：全棉府绸、涤棉纱卡、春亚纺、弹力牛仔布；后端对接后支持任意面料检索</small>
        </p>
      </div>

      <template v-else-if="report">
        <div class="report-head">
          <strong>{{ report.fabric }}</strong>
          <span class="report-count">已聚合 {{ report.competitors.length }} 个平台竞品</span>
        </div>

        <!-- 竞品对比表 -->
        <div class="table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>平台</th>
                <th>供应商 / 产区</th>
                <th>报价</th>
                <th>起订量</th>
                <th>交期</th>
                <th>评分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in report.competitors" :key="item.platform + item.supplier">
                <td class="platform">{{ item.platform }}</td>
                <td>
                  <div class="supplier">{{ item.supplier }}</div>
                  <div class="region">{{ item.region }}</div>
                </td>
                <td class="price">
                  {{ item.currency === 'USD' ? '$' : '¥' }}{{ item.price.toFixed(2) }}
                  <small>{{ item.unit }}</small>
                </td>
                <td>{{ item.moq }}</td>
                <td>{{ item.leadTime }}</td>
                <td>
                  <span class="rating">
                    <AppIcon name="sparkle" :size="12" />
                    {{ item.rating.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分析报告 -->
        <div class="analysis-card">
          <div class="analysis-head">
            <AppIcon name="bulb" :size="14" />
            <strong>调研分析与报价建议</strong>
          </div>
          <ol class="analysis-list">
            <li v-for="(line, i) in report.analysis" :key="i">{{ line }}</li>
          </ol>
        </div>
      </template>

      <div v-else class="state-card">
        <AppIcon name="research" :size="30" />
        <p>输入面料名称开始调研<br /><small>或点击上方热门面料快速体验</small></p>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import LoadingDots from '../components/LoadingDots.vue'
import { store } from '../store/index.js'
import { searchCompetitors, HOT_KEYWORDS } from '../utils/research.js'

export default {
  name: 'ResearchView',
  components: { AppIcon, LoadingDots },
  data() {
    return {
      keyword: '',
      lastKeyword: '',
      hotKeywords: HOT_KEYWORDS,
      searching: false,
      notFound: false,
      report: null
    }
  },
  methods: {
    pickKeyword(kw) {
      this.keyword = kw
      this.search()
    },
    async search() {
      const kw = this.keyword
      if (!kw || this.searching) return
      this.searching = true
      this.notFound = false
      this.report = null
      this.lastKeyword = kw
      try {
        // 演示检索也留出短暂延时，贴近真实调研体感
        await new Promise(resolve => setTimeout(resolve, 500))
        const result = await searchCompetitors(kw)
        if (result) {
          this.report = result
          store.notify('竞品调研完成')
        } else {
          this.notFound = true
        }
      } catch (error) {
        console.error('竞品调研失败:', error)
        store.notify('调研服务异常，请重试', 'error')
        this.notFound = true
      } finally {
        this.searching = false
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
  max-width: 920px;
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

/* 搜索区 */
.search-panel {
  width: 100%;
  margin-top: 28px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-md);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-icon {
  color: var(--c-text-3);
  flex-shrink: 0;
}

.search-row input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--c-text);
  padding: 8px 0;
}

.search-row input::placeholder {
  color: var(--c-text-3);
}

.search-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 4px 12px rgba(47, 84, 150, 0.3);
  transition: transform 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
}

.search-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.search-btn:disabled {
  opacity: 0.4;
  box-shadow: none;
  cursor: not-allowed;
}

.hot-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.hot-label {
  font-size: 12px;
  color: var(--c-text-3);
}

.hot-chip {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--c-primary);
  background: var(--c-primary-softer);
  border: 1px solid rgba(47, 84, 150, 0.15);
  transition: all 0.15s ease;
}

.hot-chip:hover {
  background: var(--c-primary-soft);
  border-color: rgba(47, 84, 150, 0.35);
}

/* 状态卡片 */
.state-card {
  width: 100%;
  margin-top: 26px;
  padding: 52px 20px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 1px dashed var(--c-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--c-text-3);
  text-align: center;
}

.state-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
}

.state-card small {
  font-size: 11.5px;
  color: var(--c-text-3);
}

/* 报告 */
.report-head {
  width: 100%;
  margin-top: 28px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.report-head strong {
  font-size: 17px;
  color: var(--c-text);
}

.report-count {
  font-size: 12px;
  color: var(--c-text-3);
}

.table-wrap {
  width: 100%;
  margin-top: 12px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compare-table th {
  padding: 11px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary);
  background: #f4f8fc;
  border-bottom: 1px solid var(--c-border-soft);
  white-space: nowrap;
}

.compare-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border-soft);
  color: var(--c-text-2);
  vertical-align: middle;
}

.compare-table tbody tr:last-child td {
  border-bottom: none;
}

.compare-table tbody tr:hover td {
  background: rgba(47, 84, 150, 0.03);
}

.platform {
  font-weight: 700;
  color: var(--c-text);
  white-space: nowrap;
}

.supplier {
  font-size: 12.5px;
  color: var(--c-text);
}

.region {
  font-size: 11px;
  color: var(--c-text-3);
  margin-top: 2px;
}

.price {
  font-weight: 700;
  color: var(--c-accent);
  white-space: nowrap;
}

.price small {
  font-weight: 400;
  color: var(--c-text-3);
  margin-left: 2px;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-primary);
  background: var(--c-primary-softer);
}

/* 分析 */
.analysis-card {
  width: 100%;
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(150deg, #eef3fb 0%, #f7f4ec 100%);
  border: 1px solid rgba(47, 84, 150, 0.14);
}

.analysis-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--c-primary);
}

.analysis-head strong {
  color: var(--c-text);
}

.analysis-list {
  margin: 10px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--c-text-2);
}

.analysis-list li::marker {
  color: var(--c-primary);
  font-weight: 700;
}
</style>
