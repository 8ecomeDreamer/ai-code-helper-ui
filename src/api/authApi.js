import axios from 'axios'
import { ROLE_PERMISSIONS } from '../utils/permission.js'

// 与聊天接口保持一致：开发环境走 Vite 代理，生产环境走 Nginx 同域转发
const API_BASE_URL = '/api'

// 登录态本地存储 key
export const TOKEN_KEY = 'textile-agent-token'
export const USER_KEY = 'textile-agent-user'

/**
 * 内置演示账号
 * 仅在后端鉴权接口（/api/auth/*）未实现（404）或不可达时启用，
 * 保证前端登录 / 权限流程可先行联调；后端接入后自动失效。
 */
const DEMO_ACCOUNTS = {
  admin: { password: 'admin123', role: 'admin', nickname: '管理员' },
  user: { password: 'user123', role: 'user', nickname: '纺织用户' },
  guest: { password: 'guest123', role: 'guest', nickname: '体验用户' }
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

// 规范化后端返回的用户对象：permissions 缺失时按角色映射补齐
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

// 判断错误是否属于「后端未实现鉴权接口」：404 或网络不可达
function isAuthApiMissing(error) {
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
 * 登录
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {Promise<{token: string, user: Object}>} 令牌与用户信息
 */
export async function login(username, password) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      { username, password },
      { timeout: 8000 }
    )
    const payload = response.data && response.data.data ? response.data.data : response.data
    if (!payload || !payload.token || !payload.user) {
      throw new Error('登录接口返回格式不正确')
    }
    return { token: payload.token, user: normalizeUser(payload.user) }
  } catch (error) {
    if (error.localAuth) throw error
    if (isAuthApiMissing(error)) {
      return localLogin(username, password)
    }
    // 后端明确拒绝（401 等）：透传错误信息
    const message = error.response && error.response.data && error.response.data.message
    throw new Error(message || '登录失败，请稍后重试')
  }
}

/**
 * 获取当前登录用户信息（用于校验本地登录态是否仍然有效）
 * @param {string} token 令牌
 * @returns {Promise<Object>} 用户信息
 */
export async function getUserInfo(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/info`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000
    })
    const payload = response.data && response.data.data ? response.data.data : response.data
    if (!payload || !payload.username) {
      throw new Error('用户信息接口返回格式不正确')
    }
    return normalizeUser(payload)
  } catch (error) {
    if (isAuthApiMissing(error)) {
      return localUserInfo(token)
    }
    throw error
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
      `${API_BASE_URL}/auth/logout`,
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
