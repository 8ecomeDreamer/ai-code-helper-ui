<template>
  <div class="dash-page">
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p>纺织智能体运行概览（实时数据）</p>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="loadData">
        {{ loading ? '加载中…' : '刷新' }}
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="loadData">重试</button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="item in statCards" :key="item.label" class="stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ loading ? '—' : item.value }}</div>
        <div class="stat-delta">{{ item.hint }}</div>
      </div>
    </div>

    <div class="dash-cols">
      <!-- 模块 API 调用量 -->
      <div class="dash-card">
        <div class="card-title">各模块调用量</div>
        <div class="card-desc">AI 业务接口累计调用次数与平均耗时</div>
        <div v-if="apiCalls.length" class="bar-list">
          <div v-for="bar in apiCallBars" :key="bar.name" class="bar-row">
            <div class="bar-head">
              <span>{{ bar.name }}</span>
              <strong>{{ bar.count }} 次 · {{ formatCost(bar.avgCost) }}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: bar.percent + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">暂无调用记录（新接口上线后的访问会自动累计）</div>
      </div>

      <!-- 百炼接口使用情况 -->
      <div class="dash-card">
        <div class="card-title">百炼接口使用情况</div>
        <div class="card-desc">按业务场景与模型聚合的模型调用统计</div>
        <table v-if="modelCalls.length" class="model-table">
          <thead>
            <tr>
              <th>场景</th>
              <th>模型</th>
              <th class="num">次数</th>
              <th class="num">输入/输出 tokens</th>
              <th class="num">平均耗时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in modelCalls" :key="i">
              <td>{{ row.scene }}</td>
              <td class="model-name" :title="row.model">{{ row.model }}</td>
              <td class="num">
                {{ row.count }}
                <span v-if="row.fail" class="fail-tag" :title="`失败 ${row.fail} 次`">失败 {{ row.fail }}</span>
              </td>
              <td class="num">{{ formatTokens(row.inputTokens) }} / {{ formatTokens(row.outputTokens) }}</td>
              <td class="num">{{ formatCost(row.avgCost) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-hint">暂无模型调用记录</div>
      </div>
    </div>

    <!-- 最近调用记录 -->
    <div class="dash-card recent-card">
      <div class="card-title">最近调用记录</div>
      <div class="card-desc">最新的模块调用与模型调用明细</div>
      <div v-if="recent.length" class="trace-list">
        <div v-for="(row, i) in recent" :key="i" class="trace-row">
          <span class="trace-time">{{ row.createTime }}</span>
          <span :class="['tag', row.type === 'api_call' ? 'api' : 'model']">
            {{ row.type === 'api_call' ? 'API' : '模型' }}
          </span>
          <span class="trace-q">{{ row.agent }}<template v-if="row.model"> · {{ row.model }}</template></span>
          <span :class="['tag', row.success ? 'ok' : 'fail']">{{ row.success ? '成功' : '失败' }}</span>
          <span class="trace-cost">{{ formatCost(row.costMs) }}</span>
        </div>
      </div>
      <div v-else class="empty-hint">暂无记录</div>
    </div>
  </div>
</template>

<script>
import { fetchDashboardStats } from '../../api/adminApi.js'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      loading: false,
      error: '',
      overview: {},
      apiCalls: [],
      modelCalls: [],
      recent: []
    }
  },
  computed: {
    statCards() {
      const o = this.overview || {}
      const num = v => (v === undefined || v === null ? 0 : Number(v))
      return [
        { label: '提问数量', value: num(o.questionCount), hint: '用户消息累计' },
        { label: '注册用户', value: num(o.userCount), hint: 'sys_user 有效账号' },
        { label: '知识库文档', value: num(o.knowledgeDocCount), hint: 'MinIO knowledge/ 对象数' },
        { label: '会话总数', value: num(o.sessionCount), hint: '聊天会话累计' }
      ]
    },
    /** 模块调用条形：以最大调用量为 100% 基准换算宽度 */
    apiCallBars() {
      const max = Math.max(...this.apiCalls.map(item => item.count), 1)
      return this.apiCalls.map(item => ({
        ...item,
        percent: Math.round((item.count / max) * 100)
      }))
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.error = ''
      try {
        const payload = await fetchDashboardStats()
        this.overview = payload.overview || {}
        this.apiCalls = payload.apiCalls || []
        this.modelCalls = payload.modelCalls || []
        this.recent = payload.recent || []
      } catch (err) {
        this.error = `统计数据加载失败：${err.message || err}`
      } finally {
        this.loading = false
      }
    },
    formatCost(ms) {
      const value = Number(ms) || 0
      return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`
    },
    formatTokens(tokens) {
      const value = Number(tokens) || 0
      return value >= 10000 ? `${(value / 10000).toFixed(1)}w` : String(value)
    }
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1d2333;
}

.page-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #8b93a7;
}

.refresh-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ee;
  background: #fff;
  font-size: 12.5px;
  color: #3a4152;
  transition: all 0.15s ease;
}

.refresh-btn:hover:not(:disabled) {
  border-color: #5b5bd6;
  color: #5b5bd6;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(192, 57, 43, 0.07);
  border: 1px solid rgba(192, 57, 43, 0.25);
  font-size: 13px;
  color: #c0392b;
}

.error-banner button {
  flex-shrink: 0;
  padding: 3px 12px;
  border-radius: 6px;
  border: 1px solid rgba(192, 57, 43, 0.3);
  background: #fff;
  color: #c0392b;
  font-size: 12px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.stat-card {
  padding: 16px 18px;
  border-radius: 14px;
  background: #fbfcfd;
  border: 1px solid #e4e7ee;
}

.stat-label {
  font-size: 12px;
  color: #8b93a7;
}

.stat-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 800;
  color: #1d2333;
}

.stat-delta {
  margin-top: 6px;
  font-size: 11.5px;
  color: #3a7d5d;
}

.dash-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.dash-card {
  padding: 18px;
  border-radius: 14px;
  background: #fbfcfd;
  border: 1px solid #e4e7ee;
}

.recent-card {
  margin-top: 14px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1d2333;
}

.card-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #8b93a7;
}

.empty-hint {
  margin-top: 16px;
  padding: 18px 0;
  text-align: center;
  font-size: 12.5px;
  color: #a5abc0;
}

.bar-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: #3a4152;
  margin-bottom: 6px;
}

.bar-head strong {
  color: #1d2333;
}

.bar-track {
  height: 8px;
  border-radius: 999px;
  background: #eceef4;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #5b5bd6, #7c4dc4);
}

.model-table {
  width: 100%;
  margin-top: 14px;
  border-collapse: collapse;
  font-size: 12.5px;
}

.model-table th {
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid #e4e7ee;
  color: #8b93a7;
  font-weight: 600;
  white-space: nowrap;
}

.model-table td {
  padding: 9px 6px;
  border-bottom: 1px solid #eef0f5;
  color: #3a4152;
}

.model-table tr:last-child td {
  border-bottom: none;
}

.model-table .num {
  text-align: right;
}

.model-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fail-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(192, 57, 43, 0.1);
  color: #c0392b;
  font-size: 11px;
}

.trace-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
}

.trace-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid #eef0f5;
  font-size: 12.5px;
  color: #3a4152;
}

.trace-row:last-child {
  border-bottom: none;
}

.trace-time {
  color: #8b93a7;
  flex-shrink: 0;
}

.trace-q {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trace-cost {
  color: #8b93a7;
  flex-shrink: 0;
}

/* 标签（与列表页共用视觉） */
.tag {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.tag.api {
  color: #4a53c0;
  background: rgba(91, 91, 214, 0.1);
}

.tag.model {
  color: #7c4dc4;
  background: rgba(124, 77, 196, 0.1);
}

.tag.ok {
  color: #3a7d5d;
  background: rgba(58, 125, 93, 0.1);
}

.tag.fail {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dash-cols {
    grid-template-columns: 1fr;
  }
}
</style>
