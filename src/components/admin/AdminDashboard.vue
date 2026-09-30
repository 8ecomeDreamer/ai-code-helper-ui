<template>
  <div class="dash-page">
    <div class="page-head">
      <h1>Dashboard</h1>
      <p>纺织智能体运行概览（演示数据）</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="item in stats" :key="item.label" class="stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">{{ item.value }}</div>
        <div class="stat-delta">{{ item.delta }}</div>
      </div>
    </div>

    <div class="dash-cols">
      <!-- 意图命中分布 -->
      <div class="dash-card">
        <div class="card-title">意图命中分布</div>
        <div class="card-desc">近 7 日问答意图占比</div>
        <div class="bar-list">
          <div v-for="bar in intentBars" :key="bar.name" class="bar-row">
            <div class="bar-head">
              <span>{{ bar.name }}</span>
              <strong>{{ bar.percent }}%</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: bar.percent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近链路 -->
      <div class="dash-card">
        <div class="card-title">最近问答链路</div>
        <div class="card-desc">今日请求明细</div>
        <div class="trace-list">
          <div v-for="(trace, i) in traces" :key="i" class="trace-row">
            <span class="trace-time">{{ trace.time }}</span>
            <span class="trace-q" :title="trace.question">{{ trace.question }}</span>
            <span :class="['tag', trace.intent.tag]">{{ trace.intent.text }}</span>
            <span class="trace-cost">{{ trace.cost }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { DASHBOARD_STATS, DASHBOARD_INTENT_BARS, DASHBOARD_TRACES } from './adminData.js'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      stats: DASHBOARD_STATS,
      intentBars: DASHBOARD_INTENT_BARS,
      traces: DASHBOARD_TRACES
    }
  }
}
</script>

<style scoped>
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

.tag.info {
  color: #4a53c0;
  background: rgba(91, 91, 214, 0.1);
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
