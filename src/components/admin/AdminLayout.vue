<template>
  <div :class="['admin-shell', { collapsed }]">
    <!-- 深色侧边栏 -->
    <aside class="admin-side">
      <div class="admin-brand">
        <div class="admin-logo">
          <AppIcon name="logo" :size="18" />
        </div>
        <div v-show="!collapsed" class="admin-brand-text">
          <strong>纺织管理后台</strong>
          <small>Admin Console</small>
        </div>
      </div>

      <nav class="admin-nav scroll-thin">
        <template v-for="group in visibleNav" :key="group.label">
          <div v-show="!collapsed" class="nav-group">{{ group.label }}</div>
          <template v-for="item in group.items" :key="item.route || item.key">
            <!-- 普通菜单 -->
            <button
              v-if="!item.children"
              :class="['nav-item', { active: isActive(item) }]"
              :title="item.label"
              @click="go(item.route)"
            >
              <AppIcon :name="item.icon" :size="16" />
              <span v-show="!collapsed" class="nav-label">{{ item.label }}</span>
            </button>
            <!-- 可折叠分组 -->
            <template v-else>
              <button
                :class="['nav-item', { active: isActive(item) }]"
                :title="item.label"
                @click="toggleGroup(item.key)"
              >
                <AppIcon :name="item.icon" :size="16" />
                <span v-show="!collapsed" class="nav-label">{{ item.label }}</span>
                <AppIcon
                  v-show="!collapsed"
                  :name="openKeys[item.key] ? 'chevron-down' : 'chevron-right'"
                  :size="13"
                  class="nav-arrow"
                />
              </button>
              <template v-if="openKeys[item.key]">
                <button
                  v-for="child in item.children"
                  :key="child.route"
                  :class="['nav-item', 'sub', { active: isActive(child) }]"
                  :title="child.label"
                  @click="go(child.route)"
                >
                  <AppIcon :name="child.icon" :size="14" />
                  <span v-show="!collapsed" class="nav-label">{{ child.label }}</span>
                </button>
              </template>
            </template>
          </template>
        </template>
      </nav>

      <button class="admin-collapse" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="collapsed = !collapsed">
        <AppIcon name="collapse" :size="15" />
        <span v-show="!collapsed">收起侧边栏</span>
      </button>
    </aside>

    <!-- 主区域 -->
    <div class="admin-main">
      <header class="admin-top">
        <label class="top-search">
          <AppIcon name="search" :size="15" />
          <input ref="navFilterRef" v-model="navKeyword" type="text" placeholder="筛选菜单..." />
          <kbd>Ctrl K</kbd>
        </label>
        <div class="top-actions">
          <button class="top-btn" title="返回用户端" @click="$router.push('/chat')">
            <AppIcon name="chat" :size="14" />
            <span>返回聊天</span>
          </button>
          <div class="top-user">
            <span class="top-avatar">{{ avatarChar }}</span>
            <span class="top-user-name">{{ user ? user.nickname : '' }}</span>
            <AppIcon name="chevron-down" :size="13" />
          </div>
        </div>
      </header>

      <div class="admin-content scroll-thin">
        <!-- 面包屑 -->
        <div class="crumbs">
          <span class="crumb-link" @click="go('admin-dashboard')">首页</span>
          <template v-if="$route.meta.crumbGroup">
            <i>/</i>
            <span>{{ $route.meta.crumbGroup }}</span>
          </template>
          <i>/</i>
          <span class="current">{{ $route.meta.title }}</span>
        </div>
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../AppIcon.vue'
import { store } from '../../store/index.js'

// 后端菜单 path -> 后台页路由名（见 router 的 /admin 子路由）
const AGENT_MENU_ROUTES = {
  chat: 'admin-agent-chat',
  knowledge: 'admin-knowledge',
  prompt: 'admin-agent-prompt',
  vector: 'admin-agent-vector',
  model: 'admin-agent-model',
  agentLog: 'admin-agent-log'
}

// 后端菜单 icon（sys_menu.icon）-> AppIcon 名称
const MENU_ICON_MAP = {
  ai: 'sparkle',
  message: 'chat',
  book: 'file',
  edit: 'bulb',
  database: 'database',
  cpu: 'settings',
  log: 'tasks'
}

// 静态菜单：设置组（前端控制台页，后端菜单不下发）
const SETTINGS_ITEMS = [
  { route: 'admin-users', label: '用户管理', icon: 'users' },
  { route: 'admin-questions', label: '示例问题', icon: 'bulb' },
  { route: 'admin-settings', label: '系统设置', icon: 'settings' }
]

// 本地回退菜单：后端动态菜单不可用（未接入/接口失败）时的演示导航
const LOCAL_NAV = [
  {
    label: '导航',
    items: [
      { route: 'admin-dashboard', label: 'Dashboard', icon: 'grid' },
      { route: 'admin-knowledge', label: '知识库管理', icon: 'database' },
      { route: 'admin-intents', label: '意图管理', icon: 'layers' },
      {
        key: 'channel',
        label: '数据通道',
        icon: 'flow',
        children: [
          { route: 'admin-pipelines', label: '流水线管理', icon: 'flow' },
          { route: 'admin-tasks', label: '流水线任务', icon: 'tasks' }
        ]
      },
      { route: 'admin-keywords', label: '关键词映射', icon: 'key' },
      { route: 'admin-traces', label: '链路追踪', icon: 'trace' }
    ]
  },
  { label: '设置', items: SETTINGS_ITEMS }
]

// 由后端动态菜单（若依 RouterVo 树）生成后台导航；无可用菜单时返回 null 触发回退
function buildDynamicNav(menus) {
  if (!Array.isArray(menus) || !menus.length) return null
  const items = []
  menus.forEach(top => {
    ;(top.children || []).forEach(child => {
      const route = AGENT_MENU_ROUTES[child.path]
      if (!route) return
      const meta = child.meta || {}
      items.push({
        route,
        label: meta.title || child.name || child.path,
        icon: MENU_ICON_MAP[meta.icon] || 'grid'
      })
    })
  })
  if (!items.length) return null
  return [
    { label: '导航', items: [{ route: 'admin-dashboard', label: 'Dashboard', icon: 'grid' }] },
    { label: '纺织智能体', items },
    { label: '设置', items: SETTINGS_ITEMS }
  ]
}

export default {
  name: 'AdminLayout',
  components: { AppIcon },
  data() {
    return {
      collapsed: false,
      navKeyword: '',
      openKeys: { channel: true }
    }
  },
  computed: {
    user() {
      return store.user
    },
    // 后台导航：优先后端动态菜单，不可用时回退本地演示菜单
    nav() {
      return buildDynamicNav(store.menus) || LOCAL_NAV
    },
    avatarChar() {
      return store.user && store.user.nickname ? store.user.nickname.charAt(0) : 'A'
    },
    // 顶栏搜索框过滤菜单
    visibleNav() {
      const kw = this.navKeyword.trim()
      if (!kw) return this.nav
      return this.nav
        .map(group => ({
          ...group,
          items: group.items
            .map(item => {
              if (item.label.includes(kw)) return item
              if (item.children) {
                const children = item.children.filter(child => child.label.includes(kw))
                if (children.length) return { ...item, children }
              }
              return null
            })
            .filter(Boolean)
        }))
        .filter(group => group.items.length)
    }
  },
  methods: {
    go(routeName) {
      this.$router.push({ name: routeName })
    },
    toggleGroup(key) {
      this.openKeys[key] = !this.openKeys[key]
    },
    isActive(item) {
      const current = this.$route.name
      if (item.route) return item.route === current
      return (item.children || []).some(child => child.route === current)
    },
    onKeydown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        this.$refs.navFilterRef.focus()
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown)
  }
}
</script>

<style scoped>
.admin-shell {
  height: 100%;
  display: flex;
  overflow: hidden;
  background: #eef0f4;
}

/* ===== 深色侧边栏 ===== */
.admin-side {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #171a26;
  transition: width 0.2s ease;
}

.admin-shell.collapsed .admin-side {
  width: 64px;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
}

.admin-logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #5b5bd6, #7c4dc4);
}

.admin-brand-text {
  min-width: 0;
}

.admin-brand-text strong {
  display: block;
  font-size: 14px;
  color: #f2f4fa;
  white-space: nowrap;
}

.admin-brand-text small {
  display: block;
  font-size: 10.5px;
  color: #7d8598;
  margin-top: 1px;
  white-space: nowrap;
}

.admin-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 12px;
}

.nav-group {
  font-size: 10.5px;
  letter-spacing: 1px;
  color: #6b7285;
  margin: 14px 8px 6px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin-bottom: 2px;
  border-radius: 9px;
  font-size: 13px;
  color: #aeb5c6;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e6e9f2;
}

.nav-item.active {
  background: #2b3050;
  color: #eef0ff;
  font-weight: 600;
}

.nav-item.sub {
  padding-left: 34px;
  font-size: 12.5px;
}

.nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-arrow {
  color: #6b7285;
  flex-shrink: 0;
}

.admin-shell.collapsed .nav-item {
  justify-content: center;
  padding: 9px 0;
}

.admin-shell.collapsed .nav-item.sub {
  padding-left: 0;
}

.admin-collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px;
  padding: 8px;
  border-radius: 9px;
  font-size: 12px;
  color: #8b93a7;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.15s ease;
}

.admin-collapse:hover {
  color: #e6e9f2;
  background: rgba(255, 255, 255, 0.06);
}

/* ===== 顶栏 ===== */
.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  background: #f6f7f9;
  border-bottom: 1px solid #e4e7ee;
  flex-shrink: 0;
}

.top-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 320px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e1e4ec;
  color: #8b93a7;
  transition: border-color 0.15s ease;
}

.top-search:focus-within {
  border-color: #5b5bd6;
}

.top-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #2a2f3e;
}

.top-search input::placeholder {
  color: #a0a7b8;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  color: #3a4152;
  background: #fff;
  border: 1px solid #e1e4ec;
  transition: all 0.15s ease;
}

.top-btn:hover {
  color: #5b5bd6;
  border-color: #b9b9ec;
}

.top-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e1e4ec;
  color: #6b7285;
}

.top-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #5b5bd6, #7c4dc4);
}

.top-user-name {
  font-size: 13px;
  color: #2a2f3e;
  font-weight: 600;
}

/* ===== 内容区 ===== */
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 32px 40px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #8b93a7;
  margin-bottom: 18px;
}

.crumbs i {
  font-style: normal;
  color: #c2c7d4;
}

.crumb-link {
  cursor: pointer;
  transition: color 0.15s ease;
}

.crumb-link:hover {
  color: #5b5bd6;
}

.crumbs .current {
  color: #3a4152;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .top-search {
    width: 200px;
  }
}
</style>
