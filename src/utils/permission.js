/**
 * 前端权限模型
 *
 * 角色 -> 权限映射由前端维护，用于界面开放度控制；
 * 若后端登录接口返回了 permissions 字段，则以后端结果为准（见 authApi.js 的规范化逻辑）。
 * 后期接入真实鉴权时，只需保证用户对象包含 role 或 permissions 即可。
 */

// 权限点（与业务模块 key 一致）
// chat/quote/research/compliance/fabric 为侧边栏五大业务模块；
// voice/image/export 为模块内能力开关（综合问答的语音输入、图片识别、对话导出）
export const PERMISSION = {
  CHAT: 'chat',
  QUOTE: 'quote',
  RESEARCH: 'research',
  COMPLIANCE: 'compliance',
  FABRIC: 'fabric',
  VOICE: 'voice',
  IMAGE: 'image',
  EXPORT: 'export',
  ADMIN: 'admin'
}

// 模块显示名称
export const MODULE_LABELS = {
  chat: '综合问答',
  quote: '智能报价',
  research: '竞品调研',
  compliance: '合规校验',
  fabric: '面料识别',
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
// guest（体验权限）：仅开放综合问答与语音输入，且受每日提问配额限制
export const ROLE_PERMISSIONS = {
  admin: ['chat', 'quote', 'research', 'compliance', 'fabric', 'voice', 'image', 'export', 'admin'],
  user: ['chat', 'quote', 'research', 'compliance', 'fabric', 'voice', 'image', 'export'],
  guest: ['chat', 'voice']
}

// 体验权限每日提问配额
export const TRIAL_DAILY_QUOTA = 10

// 后端超级管理员通配权限标识（见后端 Constants.ALL_PERMISSION）
export const ALL_PERMISSION = '*:*:*'

/**
 * 前端模块 -> 后端权限标识映射（sys_menu.perms，见后端 sql/init_data.sql）
 * 后端登录/getInfo 返回 permissions 集合时，按此映射判定模块开放度：
 * - chat   对话工作台菜单权限
 * - voice  语音交互视为对话发起能力（对话新增按钮权限）
 * - image  图片识别视为知识上传识别能力（文档上传解析按钮权限）
 * - export 文档导出视为调用日志查询导出能力（AI调用日志菜单权限）
 * - admin  管理后台视为模型配置能力（仅超管/授权角色持有）
 *
 * quote/research/compliance/fabric 为新增业务模块，后端尚未建对应 sys_menu，
 * 先预置目标权限标识；后端建菜单并授权后无需改前端即可生效
 */
export const MODULE_BACKEND_PERM = {
  chat: 'agent:chat:list',
  voice: 'agent:chat:add',
  image: 'agent:knowledge:upload',
  export: 'agent:log:list',
  admin: 'agent:model:list',
  // 以下为待后端建菜单的预置映射
  quote: 'agent:quote:list',
  research: 'agent:research:list',
  compliance: 'agent:compliance:list',
  fabric: 'agent:fabric:list'
}

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
 * 判断用户是否拥有某模块权限
 * 优先匹配后端权限标识（含超管通配符），兼容本地演示权限键
 * @param {Object} user 用户对象
 * @param {string} perm 前端模块权限点
 * @returns {boolean} 是否拥有
 */
export function hasPermission(user, perm) {
  const perms = permissionsOf(user)
  if (!perms.length) return false
  if (perms.includes(ALL_PERMISSION)) return true
  if (perms.includes(perm)) return true
  const backendPerm = MODULE_BACKEND_PERM[perm]
  return !!backendPerm && perms.includes(backendPerm)
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
