import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/MainLayout.vue'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'
import VoiceView from '../views/VoiceView.vue'
import ImageView from '../views/ImageView.vue'
import ExportView from '../views/ExportView.vue'
import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminDashboard from '../components/admin/AdminDashboard.vue'
import AdminListPage from '../components/admin/AdminListPage.vue'
import AdminSettings from '../components/admin/AdminSettings.vue'
import { ADMIN_PAGES } from '../components/admin/adminData.js'
import { store } from '../store/index.js'
import { hasPermission, ROLE_LABELS, MODULE_LABELS } from '../utils/permission.js'

/**
 * 路由表
 * - /login        登录页（公开）
 * - /             主布局（侧边栏 + 业务子路由）
 *   - /chat       智能问答
 *   - /voice      语音交互
 *   - /image      图片识别
 *   - /export     文档导出
 * - /admin        管理后台布局（仅 admin 权限，meta.perm 由子路由继承）
 *   - /admin/dashboard | knowledge | intents | pipelines | tasks
 *   - /admin/keywords | traces | users | questions | settings
 * 每个业务路由通过 meta.perm 声明所需权限，由全局守卫统一校验
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/chat',
    children: [
      {
        path: 'chat',
        name: 'chat',
        component: ChatView,
        meta: { perm: 'chat' }
      },
      {
        path: 'voice',
        name: 'voice',
        component: VoiceView,
        meta: { perm: 'voice' }
      },
      {
        path: 'image',
        name: 'image',
        component: ImageView,
        meta: { perm: 'image' }
      },
      {
        path: 'export',
        name: 'export',
        component: ExportView,
        meta: { perm: 'export' }
      }
    ]
  },
  {
    // 管理后台：父路由声明 admin 权限，子路由 meta 自动合并继承
    path: '/admin',
    component: AdminLayout,
    meta: { perm: 'admin' },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: AdminDashboard,
        meta: { title: 'Dashboard' }
      },
      {
        path: 'knowledge',
        name: 'admin-knowledge',
        component: AdminListPage,
        meta: { title: '知识库管理' },
        props: ADMIN_PAGES.knowledge
      },
      {
        path: 'intents',
        name: 'admin-intents',
        component: AdminListPage,
        meta: { title: '意图管理' },
        props: ADMIN_PAGES.intents
      },
      {
        path: 'pipelines',
        name: 'admin-pipelines',
        component: AdminListPage,
        meta: { title: '流水线管理', crumbGroup: '数据通道' },
        props: ADMIN_PAGES.pipelines
      },
      {
        path: 'tasks',
        name: 'admin-tasks',
        component: AdminListPage,
        meta: { title: '流水线任务', crumbGroup: '数据通道' },
        props: ADMIN_PAGES.tasks
      },
      {
        path: 'keywords',
        name: 'admin-keywords',
        component: AdminListPage,
        meta: { title: '关键词映射' },
        props: ADMIN_PAGES.keywords
      },
      {
        path: 'traces',
        name: 'admin-traces',
        component: AdminListPage,
        meta: { title: '链路追踪' },
        props: ADMIN_PAGES.traces
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminListPage,
        meta: { title: '用户管理' },
        props: ADMIN_PAGES.users
      },
      {
        path: 'questions',
        name: 'admin-questions',
        component: AdminListPage,
        meta: { title: '示例问题' },
        props: ADMIN_PAGES.questions
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: AdminSettings,
        meta: { title: '系统设置' },
        props: ADMIN_PAGES.settings
      }
    ]
  },
  // 未知路径回到问答页
  { path: '/:pathMatch(.*)*', redirect: '/chat' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局守卫：登录态 + 模块权限校验
router.beforeEach(to => {
  // 路由切换前，将进行中的流式回复收尾归档
  store.finalizeIfStreaming()

  // 公开页（登录页）：已登录则直接进入主界面
  if (to.meta.public) {
    return store.user ? { path: '/chat' } : true
  }

  // 未登录：跳转登录页并记录来路
  if (!store.user) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    }
  }

  // 模块权限校验：无权限则提示并回到问答页
  const perm = to.meta.perm
  if (perm && !hasPermission(store.user, perm)) {
    const roleLabel = ROLE_LABELS[store.user.role] || '当前账号'
    store.notify(`${roleLabel}未开放「${MODULE_LABELS[perm] || perm}」模块，请联系管理员`, 'error')
    return { path: '/chat' }
  }

  return true
})

export default router
