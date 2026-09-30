/**
 * 前端权限模型
 *
 * 角色 -> 权限映射由前端维护，用于界面开放度控制；
 * 若后端登录接口返回了 permissions 字段，则以后端结果为准（见 authApi.js 的规范化逻辑）。
 * 后期接入真实鉴权时，只需保证用户对象包含 role 或 permissions 即可。
 */

// 权限点（与业务模块 key 一致）
export const PERMISSION = {
  CHAT: 'chat',
  VOICE: 'voice',
  IMAGE: 'image',
  EXPORT: 'export',
  ADMIN: 'admin'
}

// 模块显示名称
export const MODULE_LABELS = {
  chat: '智能问答',
  voice: '语音交互',
  image: '图片识别',
  export: '文档导出',
  admin: '管理后台'
}

// 角色显示名称
export const ROLE_LABELS = {
  admin: '管理员',
  user: '正式用户',
  guest: '体验用户'
}

// 角色 -> 权限映射
// guest（体验权限）：仅开放问答与语音，且受每日提问配额限制
export const ROLE_PERMISSIONS = {
  admin: ['chat', 'voice', 'image', 'export', 'admin'],
  user: ['chat', 'voice', 'image', 'export'],
  guest: ['chat', 'voice']
}

// 体验权限每日提问配额
export const TRIAL_DAILY_QUOTA = 10

const QUOTA_KEY_PREFIX = 'textile-agent-quota-'

/**
 * 获取用户的有效权限列表
 * @param {Object} user 用户对象
 * @returns {Array<string>} 权限点列表
 */
export function permissionsOf(user) {
  if (!user) return []
  if (Array.isArray(user.permissions) && user.permissions.length) {
    return user.permissions
  }
  return ROLE_PERMISSIONS[user.role] || []
}

/**
 * 判断用户是否拥有某个权限点
 * @param {Object} user 用户对象
 * @param {string} perm 权限点
 * @returns {boolean} 是否拥有
 */
export function hasPermission(user, perm) {
  return permissionsOf(user).includes(perm)
}

/**
 * 是否为体验权限用户
 * @param {Object} user 用户对象
 * @returns {boolean} 是否体验用户
 */
export function isTrial(user) {
  return !!user && user.role === 'guest'
}

function todayKey() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function readUsedQuota() {
  try {
    return parseInt(localStorage.getItem(QUOTA_KEY_PREFIX + todayKey()) || '0', 10) || 0
  } catch (error) {
    return 0
  }
}

/**
 * 获取体验用户今日剩余提问次数（非体验用户返回 null 表示不限制）
 * @param {Object} user 用户对象
 * @returns {number|null} 剩余次数
 */
export function getRemainingQuota(user) {
  if (!isTrial(user)) return null
  return Math.max(0, TRIAL_DAILY_QUOTA - readUsedQuota())
}

/**
 * 消耗一次提问配额（仅体验用户需要调用）
 */
export function consumeQuota() {
  try {
    localStorage.setItem(QUOTA_KEY_PREFIX + todayKey(), String(readUsedQuota() + 1))
  } catch (error) {
    console.error('记录提问配额失败:', error)
  }
}
