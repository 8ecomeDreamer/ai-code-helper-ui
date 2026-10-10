import { reactive } from 'vue'
import { chatWithSSE, recognizeImage } from '../api/chatApi.js'
import {
  loadAuth,
  saveAuth,
  clearAuth,
  getUserInfo,
  getRouters,
  logout as apiLogout
} from '../api/authApi.js'
import {
  uid,
  createSession,
  loadSessions,
  saveSessions,
  exportSessionAs
} from '../utils/index.js'
import {
  hasPermission,
  isTrial,
  getRemainingQuota,
  consumeQuota,
  TRIAL_DAILY_QUOTA,
  PERMISSION
} from '../utils/permission.js'

/**
 * 全局应用状态（会话 / 流式回复 / 登录态 / 轻提示）
 * 路由跳转与视图渲染均从 store 读取数据，App.vue 不再承载业务逻辑
 */
export const store = reactive({
  /* ---------- 状态 ---------- */
  // 登录态
  token: null,
  user: null,
  // 后端动态菜单（/getRouters 返回的 RouterVo 树），空时管理后台回退本地菜单
  menus: [],
  // 体验权限今日剩余提问次数（非体验用户为 null）
  quotaRemaining: null,
  // 会话列表
  sessions: [],
  activeSessionId: null,
  // received 标记本次流式回复是否收到过内容，用于失败提示
  streaming: { active: false, content: '', received: false },
  streamingSessionId: null,
  currentEventSource: null,
  // 综合问答待识别图片附件（输入区 chip，发送时内联识别）
  pendingAttachment: null,
  toasts: [],

  /* ---------- 计算属性 ---------- */
  get activeSession() {
    return this.sessions.find(session => session.id === this.activeSessionId) || null
  },

  /* ---------- 初始化 ---------- */
  init() {
    this.sessions = loadSessions()

    // 恢复本地登录态，并后台校验有效性
    const auth = loadAuth()
    this.token = auth.token
    this.user = auth.user
    this.refreshQuota()
    if (auth.token && auth.user) {
      getUserInfo(auth.token)
        .then(user => {
          this.user = user
          saveAuth(this.token, user)
          this.refreshQuota()
          this.fetchMenus()
        })
        .catch(error => {
          console.warn('[auth] 本地登录态已失效:', error.message)
          clearAuth()
          this.token = null
          this.user = null
          this.menus = []
          this.quotaRemaining = null
        })
    }
  },

  /* ---------- 登录与权限 ---------- */
  canUse(perm) {
    return hasPermission(this.user, perm)
  },

  refreshQuota() {
    this.quotaRemaining = getRemainingQuota(this.user)
  },

  setAuth({ token, user }) {
    this.token = token
    this.user = user
    saveAuth(token, user)
    this.refreshQuota()
    this.fetchMenus()
    this.notify(`欢迎，${user.nickname || user.username}`)
  },

  // 拉取后端动态菜单（失败时置空，由管理后台回退本地菜单）
  async fetchMenus() {
    if (!this.token) {
      this.menus = []
      return
    }
    this.menus = await getRouters(this.token)
  },

  async logout() {
    this.finalizeIfStreaming()
    await apiLogout(this.token)
    this.token = null
    this.user = null
    this.menus = []
    this.quotaRemaining = null
    this.activeSessionId = null
    this.notify('已退出登录')
  },

  // 管理后台访问权限校验（跳转由调用方执行路由导航）
  openAdmin() {
    if (!this.canUse(PERMISSION.ADMIN)) {
      this.notify('无管理后台访问权限，请联系管理员开通', 'error')
      return false
    }
    return true
  },

  /* ---------- 会话管理 ---------- */
  newChat() {
    this.finalizeIfStreaming()
    this.activeSessionId = null
  },

  selectSession(id) {
    this.finalizeIfStreaming()
    this.activeSessionId = id
  },

  deleteSession(id) {
    this.finalizeIfStreaming()
    this.sessions = this.sessions.filter(session => session.id !== id)
    if (this.activeSessionId === id) {
      this.activeSessionId = null
    }
    this.persist()
    this.notify('对话已删除')
  },

  ensureActiveSession() {
    let session = this.activeSession
    if (!session) {
      session = createSession()
      this.sessions.unshift(session)
      this.activeSessionId = session.id
    }
    return session
  },

  persist() {
    saveSessions(this.sessions)
  },

  /* ---------- 问答流程 ---------- */
  sendMessage(text) {
    const content = String(text || '').trim()
    if (!content) return false
    this.finalizeIfStreaming()

    // 体验权限：每日提问配额校验
    if (isTrial(this.user)) {
      const remaining = getRemainingQuota(this.user)
      if (remaining <= 0) {
        this.notify(`体验权限今日 ${TRIAL_DAILY_QUOTA} 次提问已用完，请联系管理员升级账号`, 'error')
        return false
      }
    }

    const session = this.ensureActiveSession()
    if (session.title === '新对话') {
      session.title = content.slice(0, 24)
    }
    session.messages.push({
      id: uid(),
      role: 'user',
      content,
      timestamp: Date.now()
    })
    session.updatedAt = Date.now()
    this.persist()

    if (isTrial(this.user)) {
      consumeQuota()
      this.refreshQuota()
    }

    this.startAiResponse(session, content)
    return true
  },

  startAiResponse(session, message) {
    this.streaming = { active: true, content: '', received: false }
    this.streamingSessionId = session.id

    // 关闭之前的连接
    if (this.currentEventSource) {
      this.currentEventSource.close()
    }

    // 用箭头函数包一层，保证回调内部 this 指向 store
    this.currentEventSource = chatWithSSE(
      session.memoryId,
      message,
      data => this.handleAiMessage(data),
      error => this.handleAiError(error),
      () => this.handleAiClose()
    )
  },

  handleAiMessage(data) {
    this.streaming.content += data
    this.streaming.received = true
  },

  handleAiError(error) {
    console.error('AI 回复出错:', error)
    this.notify('连接服务器失败，请检查后端服务是否启动', 'error')
    this.finishAiResponse(true)
  },

  handleAiClose() {
    this.finishAiResponse(false)
  },

  finishAiResponse(suppressEmptyTip) {
    const content = this.streaming.content.trim()
    const session = this.sessions.find(item => item.id === this.streamingSessionId)

    if (session && content) {
      session.messages.push({
        id: uid(),
        role: 'ai',
        content,
        timestamp: Date.now()
      })
      session.updatedAt = Date.now()
      this.persist()
    } else if (!suppressEmptyTip && !this.streaming.received && this.streamingSessionId) {
      // 连接结束但未收到任何内容：后端未启动或接口异常
      this.notify('未获取到 AI 回复，请检查后端服务是否启动', 'error')
    }

    this.streaming = { active: false, content: '', received: false }
    this.streamingSessionId = null

    if (this.currentEventSource) {
      this.currentEventSource.close()
      this.currentEventSource = null
    }
  },

  // 切换路由 / 会话时，将进行中的流式回复收尾归档
  finalizeIfStreaming() {
    if (this.streaming.active) {
      this.finishAiResponse(true)
    }
  },

  /* ---------- 综合问答：语音 / 图片能力 ---------- */
  // 挂接待识别图片（权限不足时返回 false）
  attachImage(file) {
    if (!this.canUse(PERMISSION.IMAGE)) {
      this.notify('当前账号权限未开放图片识别功能', 'error')
      return false
    }
    this.pendingAttachment = file
    return true
  },

  removeAttachment() {
    this.pendingAttachment = null
  },

  // 发送时内联识别待处理图片：识别结果成对消息写入当前会话
  async recognizePendingAttachment() {
    const file = this.pendingAttachment
    if (!file) return false
    this.pendingAttachment = null
    this.finalizeIfStreaming()

    const session = this.ensureActiveSession()
    if (session.title === '新对话') {
      session.title = `图片识别：${file.name}`.slice(0, 24)
    }
    session.messages.push({
      id: uid(),
      role: 'user',
      content: `请识别这张图片的内容：${file.name}`,
      timestamp: Date.now()
    })
    session.updatedAt = Date.now()
    this.persist()

    try {
      const result = await recognizeImage(file)
      session.messages.push({
        id: uid(),
        role: 'ai',
        content: result || '识别完成，但后端未返回内容',
        timestamp: Date.now()
      })
      this.notify('图片识别完成')
    } catch (error) {
      console.error('图片识别失败:', error)
      session.messages.push({
        id: uid(),
        role: 'ai',
        content:
          '> ⚠️ 图片识别服务暂不可用：后端 `/api/ai/image/recognize` 接口未就绪，待后端对接后即可在对话内直接识别图片。',
        timestamp: Date.now()
      })
      this.notify('识别服务连接失败，待后端对接', 'error')
    }
    session.updatedAt = Date.now()
    this.persist()
    return true
  },

  exportCurrent() {
    if (!this.canUse(PERMISSION.EXPORT)) {
      this.notify('当前账号权限未开放文档导出功能', 'error')
      return
    }
    const session = this.activeSession
    if (!session || !session.messages.length) {
      this.notify('当前还没有可导出的对话内容')
      return
    }
    try {
      const filename = exportSessionAs(session, 'md')
      this.notify(`已导出：${filename}`)
    } catch (error) {
      console.error('导出失败:', error)
      this.notify('导出失败，请重试', 'error')
    }
  },

  /* ---------- 轻提示 ---------- */
  notify(message, type = 'info') {
    const toast = { id: uid(), message, type }
    this.toasts.push(toast)
    setTimeout(() => {
      this.toasts = this.toasts.filter(item => item.id !== toast.id)
    }, 3200)
  },

  closeEventSource() {
    if (this.currentEventSource) {
      this.currentEventSource.close()
      this.currentEventSource = null
    }
  }
})
