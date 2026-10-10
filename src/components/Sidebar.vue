<template>
  <aside class="sidebar">
    <!-- 品牌标识 -->
    <div class="brand">
      <div class="brand-logo">
        <AppIcon name="logo" :size="20" />
      </div>
      <div class="brand-text">
        <div class="brand-title">纺织智能体</div>
        <div class="brand-sub">Textile AI Agent</div>
      </div>
    </div>

    <!-- 快速开始卡片 -->
    <div class="quick-card">
      <div class="quick-head">
        <span>快速开始</span>
        <span class="quick-head-right">
          <!-- 管理后台入口：点击由 App 校验跳转权限 -->
          <button
            class="admin-link"
            :title="canAdmin ? '打开管理后台' : '无管理后台访问权限'"
            @click="$emit('open-admin')"
          >
            <AppIcon name="settings" :size="11" />
            <span>管理后台</span>
            <AppIcon v-if="!canAdmin" name="lock" :size="10" class="admin-lock" />
          </button>
          <span class="quick-badge">多模块</span>
        </span>
      </div>
      <button class="quick-new" @click="$emit('new-chat')">
        <span class="quick-new-icon">
          <AppIcon name="plus" :size="18" />
        </span>
        <span class="quick-new-text">
          <strong>新建对话</strong>
          <small>从空白开始</small>
        </span>
      </button>
      <nav class="module-nav">
        <button
          v-for="item in modules"
          :key="item.key"
          :class="['module-item', { active: activeModule === item.key, locked: !canUse(item.key) }]"
          :title="canUse(item.key) ? item.label : `${item.label}（当前权限未开放）`"
          @click="$emit('select-module', item.key)"
        >
          <AppIcon :name="item.icon" :size="15" />
          <span>{{ item.label }}</span>
          <AppIcon v-if="!canUse(item.key)" name="lock" :size="11" class="module-lock" />
        </button>
      </nav>
      <!-- 体验权限配额提示 -->
      <div v-if="isTrialUser" class="quota-tip">
        <AppIcon name="sparkle" :size="12" />
        <span>体验权限 · 今日剩余 {{ remainingQuota }} 次提问</span>
      </div>
    </div>

    <!-- 搜索对话 -->
    <div class="search-card">
      <div class="search-head">
        <span>搜索对话</span>
        <span class="search-count">共 {{ sessions.length }} 条</span>
      </div>
      <label class="search-box">
        <AppIcon name="search" :size="14" />
        <input v-model="keyword" type="text" placeholder="搜索对话..." />
        <button v-if="keyword" class="search-clear" @click="keyword = ''">
          <AppIcon name="x" :size="12" />
        </button>
      </label>
    </div>

    <!-- 历史记录 -->
    <div class="history scroll-thin">
      <template v-if="filteredGroups.length">
        <div v-for="group in filteredGroups" :key="group.label" class="history-group">
          <div class="history-label">{{ group.label }}</div>
          <button
            v-for="session in group.items"
            :key="session.id"
            :class="['history-item', { active: session.id === activeSessionId }]"
            :title="session.title"
            @click="$emit('select-session', session.id)"
          >
            <AppIcon name="chat" :size="14" class="history-icon" />
            <span class="history-title">{{ session.title }}</span>
            <span
              class="history-del"
              title="删除该对话"
              @click.stop="$emit('delete-session', session.id)"
            >
              <AppIcon name="trash" :size="13" />
            </span>
          </button>
        </div>
      </template>
      <div v-else class="history-empty">
        <AppIcon name="history" :size="22" />
        <p>{{ keyword ? '未找到匹配的对话' : '暂无历史记录，开始第一次对话吧' }}</p>
      </div>
    </div>

    <!-- 当前用户 -->
    <div class="sidebar-footer">
      <div class="footer-avatar">{{ avatarChar }}</div>
      <div class="footer-text">
        <strong>{{ user ? user.nickname : '未登录' }}</strong>
        <small>
          {{ roleLabel }}
          <template v-if="isTrialUser"> · 体验配额制</template>
        </small>
      </div>
      <button class="footer-logout" title="退出登录" @click="$emit('logout')">
        <AppIcon name="logout" :size="15" />
      </button>
    </div>
  </aside>
</template>

<script>
import AppIcon from './AppIcon.vue'
import { groupSessionsByDate } from '../utils/index.js'
import { hasPermission, isTrial, ROLE_LABELS } from '../utils/permission.js'

export default {
  name: 'SidebarView',
  components: { AppIcon },
  props: {
    sessions: {
      type: Array,
      default: () => []
    },
    activeSessionId: {
      type: String,
      default: null
    },
    activeModule: {
      type: String,
      default: 'chat'
    },
    user: {
      type: Object,
      default: null
    },
    // 体验用户今日剩余提问次数（非体验用户为 null）
    remainingQuota: {
      type: Number,
      default: null
    }
  },
  emits: ['new-chat', 'select-session', 'select-module', 'delete-session', 'open-admin', 'logout'],
  data() {
    return {
      keyword: '',
      modules: [
        { key: 'chat', label: '综合问答', icon: 'chat' },
        { key: 'quote', label: '智能报价', icon: 'quote' },
        { key: 'research', label: '竞品调研', icon: 'research' },
        { key: 'compliance', label: '合规校验', icon: 'compliance' },
        { key: 'fabric', label: '面料识别', icon: 'fabric' }
      ]
    }
  },
  computed: {
    filteredGroups() {
      const kw = this.keyword.trim()
      const list = kw
        ? this.sessions.filter(session =>
            session.title.includes(kw) ||
            session.messages.some(message => message.content.includes(kw))
          )
        : this.sessions
      return groupSessionsByDate(list)
    },
    canAdmin() {
      return hasPermission(this.user, 'admin')
    },
    isTrialUser() {
      return isTrial(this.user)
    },
    roleLabel() {
      return this.user ? ROLE_LABELS[this.user.role] || '用户' : ''
    },
    avatarChar() {
      return this.user && this.user.nickname ? this.user.nickname.charAt(0) : '客'
    }
  },
  methods: {
    canUse(moduleKey) {
      return hasPermission(this.user, moduleKey)
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 264px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 14px 14px;
  background: var(--c-sidebar);
  border-right: 1px solid var(--c-border-soft);
}

/* 品牌 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 6px;
}

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496 0%, #4a72c0 100%);
  box-shadow: 0 6px 14px rgba(47, 84, 150, 0.28);
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text);
}

.brand-sub {
  font-size: 11px;
  color: var(--c-text-3);
  margin-top: 1px;
}

/* 快速开始 */
.quick-card {
  border-radius: var(--radius-lg);
  padding: 10px;
  background: linear-gradient(150deg, #eef3fb 0%, #f7f4ec 60%, #f3ecdf 100%);
  border: 1px solid rgba(47, 84, 150, 0.08);
}

.quick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-2);
  margin-bottom: 8px;
}

.quick-head-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 管理后台入口（紧邻多模块徽标） */
.admin-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--c-primary);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(47, 84, 150, 0.12);
  transition: all 0.15s ease;
}

.admin-link:hover {
  background: #fff;
  border-color: rgba(47, 84, 150, 0.35);
}

.admin-lock {
  color: var(--c-text-3);
}

.quick-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--c-primary);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(47, 84, 150, 0.15);
  padding: 2px 8px;
  border-radius: 999px;
}

.quick-new {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 13px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  text-align: left;
}

.quick-new:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.quick-new-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #5b83cc);
}

.quick-new-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-new-text strong {
  font-size: 13px;
  color: var(--c-text);
}

.quick-new-text small {
  font-size: 11px;
  color: var(--c-text-3);
}

/* 模块导航 */
.module-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 8px;
}

.module-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border-radius: 9px;
  font-size: 11.5px;
  color: var(--c-text-2);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.module-item > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-item:hover {
  color: var(--c-primary);
  background: #fff;
}

.module-item.active {
  color: var(--c-primary);
  background: #fff;
  border-color: rgba(47, 84, 150, 0.25);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.module-item.locked {
  color: var(--c-text-3);
  background: rgba(255, 255, 255, 0.35);
}

.module-item.locked:hover {
  color: var(--c-text-2);
}

.module-lock {
  margin-left: auto;
  color: var(--c-text-3);
}

/* 体验配额提示 */
.quota-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 9px;
  border-radius: 9px;
  font-size: 11px;
  color: var(--c-accent);
  background: rgba(194, 106, 74, 0.08);
  border: 1px dashed rgba(194, 106, 74, 0.35);
}

/* 搜索 */
.search-card {
  border-radius: var(--radius-lg);
  padding: 12px;
  background: #fff;
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-sm);
}

.search-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-2);
  margin-bottom: 8px;
}

.search-count {
  font-size: 10px;
  font-weight: 400;
  color: var(--c-text-3);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 10px;
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border-soft);
  color: var(--c-text-3);
  transition: border-color 0.15s ease;
}

.search-box:focus-within {
  border-color: rgba(47, 84, 150, 0.35);
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--c-text);
}

.search-box input::placeholder {
  color: var(--c-text-3);
}

.search-clear {
  display: flex;
  color: var(--c-text-3);
}

.search-clear:hover {
  color: var(--c-text-2);
}

/* 历史记录 */
.history {
  flex: 1;
  overflow-y: auto;
  padding: 2px 4px 2px 6px;
  margin: 0 -2px;
}

.history-label {
  font-size: 11px;
  color: var(--c-text-3);
  margin: 10px 0 6px 4px;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px;
  border-radius: 10px;
  color: var(--c-text-2);
  font-size: 13px;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.history-item:hover {
  background: rgba(47, 84, 150, 0.06);
  color: var(--c-text);
}

.history-item.active {
  background: var(--c-primary-soft);
  color: var(--c-primary-strong);
  font-weight: 600;
}

.history-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.history-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-del {
  display: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--c-text-3);
  flex-shrink: 0;
}

.history-item:hover .history-del {
  display: flex;
}

.history-del:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 34px 12px;
  color: var(--c-text-3);
  text-align: center;
}

.history-empty p {
  font-size: 12px;
  margin: 0;
  line-height: 1.6;
}

/* 当前用户 */
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px 4px;
  border-top: 1px solid var(--c-border-soft);
}

.footer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-primary-strong);
  background: linear-gradient(135deg, #e8eef8, #f3ecdf);
  border: 1px solid rgba(47, 84, 150, 0.15);
  flex-shrink: 0;
}

.footer-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.footer-text strong {
  font-size: 12.5px;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-text small {
  font-size: 10.5px;
  color: var(--c-text-3);
}

.footer-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--c-text-3);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.footer-logout:hover {
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
}

@media (max-width: 900px) {
  .sidebar {
    width: 220px;
  }
}
</style>
