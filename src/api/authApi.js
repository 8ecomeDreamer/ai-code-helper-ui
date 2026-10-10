import axios from 'axios'
import { ROLE_PERMISSIONS } from '../utils/permission.js'

// 与聊天接口保持一致：开发环境走 Vite 代理，生产环境走 Nginx 同域转发。
// 后端（ai-code-helper）context-path 为 /api，鉴权接口为若依风格：
//   POST /api/login      登录，返回 { code, msg, token }
//   GET  /api/getInfo    用户信息，返回 { code, msg, user, roles, permissions }
//   GET  /api/getRouters 动态菜单，返回 { code, msg, data: RouterVo[] }
//   POST /api/logout     退出，返回 { code, msg }
const API_BASE_URL = '/api'

// 登录态本地存储 key
export const TOKEN_KEY = 'textile-agent-token'
export const USER_KEY = 'textile-agent-user'

// 后端业务成功状态码（Constants.SUCCESS）
const CODE_SUCCESS = 200

/**
 * 内置演示账号
 * 仅在后端鉴权接口未实现（404/501）或不可达时启用，
 * 保证前端登录 / 权限流程可先行联调；后端接入后自动失效。
 */
const DEMO_ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', nickname: '管理员' },
  user: { password: 'user123', role: 'user', nickname: '纺织用户' },
  guest: { password: 'guest123', role: 'guest', nickname: '体验用户' }
}

// 后端角色标识（sys_role.role_key）-> 前端角色
const BACKEND_ROLE_MAP = {
  admin: 'admin',
  textile_biz: 'user',
  textile_guest: 'guest'
}

/* ---------------- 本地登录态存取 ---------------- */

/**
 * 读取本地登录态
 * @returns {{token: string|null, user: Object|null}} 登录态
 */
export function loadAuth() {
  let user = null
  try {
    const raw = localStorage.getItem(USER_KEY)
    user = raw ? JSON.parse(raw) : null
  } catch (error) {
    console.error('读取本地用户信息失败:', error)
  }
  return {
    token: localStorage.getItem(TOKEN_KEY),
    user
  }
}

/**
 * 保存登录态到本地
 * @param {string} token 令牌
 * @param {Object} user 用户对象
 */
export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * 清除本地登录态
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/* ---------------- 接口封装 ---------------- */

// 校验若依风格返回包：code 非 200 视为业务失败并抛出 msg
// 抛出的错误带 business 标记，避免被 isAuthApiMissing 误判为接口缺失而降级
function unwrap(response) {
  const payload = response.data
  if (!payload || typeof payload.code !== 'number') {
    const error = new Error('接口返回格式不正确')
    error.business = true
    throw error
  }
  if (payload.code !== CODE_SUCCESS) {
    const error = new Error(payload.msg || '请求失败')
    error.business = true
    throw error
  }
  return payload
}

// 后端角色标识集合 -> 前端角色（无法识别时归为正式用户）
function roleFromRoles(roles) {
  const list = Array.isArray(roles) ? roles : []
  for (const key of list) {
    if (BACKEND_ROLE_MAP[key]) return BACKEND_ROLE_MAP[key]
  }
  return 'user'
}

// 规范化 /getInfo 返回：user 为 snake_case 的 SysUser，roles/permissions 为标识集合
function normalizeBackendUser(payload) {
  const rawUser = payload.user || {}
  const roles = Array.isArray(payload.roles) ? payload.roles : []
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : []
  return {
    username: rawUser.user_name || rawUser.username || '',
    nickname: rawUser.nick_name || rawUser.nickname || rawUser.user_name || '用户',
    role: roleFromRoles(roles),
    roles,
    permissions
  }
}

// 规范化本地演示用户：permissions 缺失时按角色映射补齐前端权限键
function normalizeUser(rawUser) {
  const user = {
    username: rawUser.username || '',
    nickname: rawUser.nickname || rawUser.username || '用户',
    role: rawUser.role || 'user'
  }
  if (Array.isArray(rawUser.permissions) && rawUser.permissions.length) {
    user.permissions = rawUser.permissions
  } else if (ROLE_PERMISSIONS[user.role]) {
    user.permissions = ROLE_PERMISSIONS[user.role]
  }
  return user
}

// 判断错误是否属于「后端未实现鉴权接口」：404/501 或网络不可达。
// 注意：401/403/业务 code 500 均为后端明确响应，不得降级，避免吞掉真实鉴权拒绝
function isAuthApiMissing(error) {
  if (error.business || error.localAuth) return false // 后端明确业务响应
  if (!error.response) return true // 网络错误 / 后端未启动
  return error.response.status === 404 || error.response.status === 501
}

// 本地演示登录（后端鉴权接口缺失时的兜底）
function localLogin(username, password) {
  const account = DEMO_ACCOUNTS[username]
  if (!account || account.password !== password) {
    const error = new Error('用户名或密码错误')
    error.localAuth = true
    throw error
  }
  console.warn('[auth] 后端鉴权接口未接入，使用内置演示账号登录')
  return {
    token: `demo-${account.role}-${Date.now()}`,
    user: normalizeUser({ username, role: account.role, nickname: account.nickname })
  }
}

// 本地解析演示令牌（后端鉴权接口缺失时的兜底）
function localUserInfo(token) {
  const role = String(token || '').split('-')[1]
  const entry = Object.entries(DEMO_ACCOUNTS).find(([, value]) => value.role === role)
  if (!entry) {
    throw new Error('登录态已失效，请重新登录')
  }
  return normalizeUser({ username: entry[0], role, nickname: entry[1].nickname })
}

/**
 * 登录：先取 JWT 令牌，再拉取用户信息（角色 + 权限标识）
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise<{token: string, user: Object}>} 令牌与用户信息
 */
export async function login(username, password) {
  let token
  try {
    const payload = unwrap(
      await axios.post(`${API_BASE_URL}/login`, { username, password }, { timeout: 8000 })
    )
    if (!payload.token) {
      const error = new Error('登录接口未返回令牌')
      error.business = true
      throw error
    }
    token = payload.token
  } catch (error) {
    if (error.localAuth) throw error
    if (isAuthApiMissing(error)) {
      return localLogin(username, password)
    }
    throw new Error(error.message || '登录失败，请稍后重试')
  }

  const user = await getUserInfo(token)
  return { token, user }
}

/**
 * 获取当前登录用户信息（角色 + 权限标识），用于登录装配与本地登录态校验
 * @param {string} token 令牌
 * @returns {Promise<Object>} 用户信息
 */
export async function getUserInfo(token) {
  try {
    const payload = unwrap(
      await axios.get(`${API_BASE_URL}/getInfo`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      })
    )
    return normalizeBackendUser(payload)
  } catch (error) {
    if (error.localAuth) throw error
    if (isAuthApiMissing(error)) {
      return localUserInfo(token)
    }
    throw error
  }
}

/**
 * 获取当前用户动态菜单（若依 RouterVo 树），失败时返回空数组由前端回退本地菜单
 * @param {string} token 令牌
 * @returns {Promise<Array>} 菜单树
 */
export async function getRouters(token) {
  try {
    const payload = unwrap(
      await axios.get(`${API_BASE_URL}/getRouters`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      })
    )
    return Array.isArray(payload.data) ? payload.data : []
  } catch (error) {
    console.warn('[auth] 动态菜单获取失败，回退本地菜单:', error.message)
    return []
  }
}

/**
 * 退出登录
 * @param {string} token 令牌
 * @returns {Promise<void>}
 */
export async function logout(token) {
  try {
    await axios.post(
      `${API_BASE_URL}/logout`,
      {},
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    )
  } catch (error) {
    // 登出接口缺失或失败不阻塞前端退出流程
    console.warn('[auth] 后端登出接口不可用，仅清除本地登录态')
  } finally {
    clearAuth()
  }
}
