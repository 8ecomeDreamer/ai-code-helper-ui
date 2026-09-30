import { renderMarkdown } from './markdown.js'

/**
 * 生成聊天室ID
 * @returns {number} 适合int范围的聊天室ID
 */
export function generateMemoryId() {
    // 使用当前时间戳的后9位，确保在int范围内
    return Math.floor(Date.now() % 1000000000)
}

/**
 * 格式化时间
 * @param {Date|number} date 日期对象或时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(date) {
    const d = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diff = now - d

    if (diff < 60000) { // 1分钟内
        return '刚刚'
    } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`
    } else {
        return d.toLocaleDateString()
    }
}

/**
 * 格式化日期时间（导出文档用）
 * @param {number} timestamp 时间戳
 * @returns {string} yyyy-MM-dd HH:mm
 */
export function formatDateTime(timestamp) {
    const d = new Date(timestamp)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

/* ---------------- 本地历史会话存储 ---------------- */

const SESSIONS_STORAGE_KEY = 'textile-agent-sessions'

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 创建一个新的会话对象
 * @returns {Object} 会话对象
 */
export function createSession() {
    return {
        id: uid(),
        memoryId: generateMemoryId(),
        title: '新对话',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    }
}

/**
 * 从 localStorage 读取历史会话
 * @returns {Array} 会话列表
 */
export function loadSessions() {
    try {
        const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
        if (!raw) return []
        const list = JSON.parse(raw)
        return Array.isArray(list) ? list : []
    } catch (error) {
        console.error('读取本地历史会话失败:', error)
        return []
    }
}

/**
 * 将历史会话持久化到 localStorage
 * @param {Array} sessions 会话列表
 */
export function saveSessions(sessions) {
    try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
        console.error('保存本地历史会话失败:', error)
    }
}

/**
 * 按日期分组会话（今天 / 昨天 / 近 7 天 / 更早）
 * @param {Array} sessions 会话列表
 * @returns {Array<{label: string, items: Array}>} 分组结果
 */
export function groupSessionsByDate(sessions) {
    const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
    const now = new Date()
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const day = 86400000
    const groups = []

    for (const session of sorted) {
        const t = session.updatedAt
        let label
        if (t >= startToday) label = '今天'
        else if (t >= startToday - day) label = '昨天'
        else if (t >= startToday - 6 * day) label = '近 7 天'
        else label = '更早'

        let group = groups.find(g => g.label === label)
        if (!group) {
            group = { label, items: [] }
            groups.push(group)
        }
        group.items.push(session)
    }
    return groups
}

/* ---------------- 会话文档导出 ---------------- */

/**
 * 清理文件名中的非法字符
 * @param {string} name 原始名称
 * @returns {string} 安全文件名
 */
export function sanitizeFilename(name) {
    return String(name).replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 40) || '对话记录'
}

/**
 * 生成会话的 Markdown 文档内容
 * @param {Object} session 会话对象
 * @returns {string} Markdown 文本
 */
export function buildSessionMarkdown(session) {
    const lines = []
    lines.push(`# ${session.title}`)
    lines.push('')
    lines.push(`> 来源：纺织主题智能体　|　导出时间：${formatDateTime(Date.now())}　|　共 ${session.messages.length} 条消息`)
    lines.push('')
    lines.push('---')
    lines.push('')
    for (const message of session.messages) {
        const role = message.role === 'user' ? '用户' : '助手'
        lines.push(`## ${role}　${formatDateTime(message.timestamp)}`)
        lines.push('')
        lines.push(message.content)
        lines.push('')
    }
    return lines.join('\n')
}

/**
 * 生成会话的 HTML 文档内容（Word 导出复用）
 * @param {Object} session 会话对象
 * @param {boolean} forWord 是否为 Word 导出（精简样式）
 * @returns {string} HTML 文本
 */
export function buildSessionHtml(session, forWord = false) {
    const escapeHtml = text => String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    const body = session.messages.map(message => {
        const role = message.role === 'user' ? '用户' : '助手'
        const content = message.role === 'user'
            ? `<p>${escapeHtml(message.content).replace(/\n/g, '<br>')}</p>`
            : renderMarkdown(message.content)
        return `<section class="msg ${message.role}"><h3>${role}　${formatDateTime(message.timestamp)}</h3>${content}</section>`
    }).join('\n')

    const style = forWord ? '' : `
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #212b3f; line-height: 1.75; }
  h1 { color: #2f5496; border-bottom: 2px solid #e8eef8; padding-bottom: 12px; }
  .msg { margin: 20px 0; padding: 14px 18px; border-radius: 12px; background: #f7f9fc; }
  .msg.user { background: #eef3fb; }
  .msg h3 { margin: 0 0 8px; font-size: 13px; color: #5d6b84; }
  pre { background: #f2f4f8; padding: 10px 12px; border-radius: 8px; overflow-x: auto; }
  code { font-family: Consolas, monospace; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dde2ea; padding: 6px 10px; }
  blockquote { margin: 8px 0; padding: 6px 14px; border-left: 3px solid #2f5496; background: #f4f8fc; color: #5d6b84; }
</style>`

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${session.title}</title>${style}
</head>
<body>
<h1>${session.title}</h1>
<p>来源：纺织主题智能体　|　导出时间：${formatDateTime(Date.now())}　|　共 ${session.messages.length} 条消息</p>
${body}
</body>
</html>`
}

/**
 * 触发浏览器下载文件
 * @param {string} filename 文件名
 * @param {string} content 文件内容
 * @param {string} mime MIME 类型
 */
export function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * 按指定格式导出会话文档
 * @param {Object} session 会话对象
 * @param {'md'|'doc'|'html'} format 导出格式
 * @returns {string} 导出的文件名
 */
export function exportSessionAs(session, format) {
    const base = `${sanitizeFilename(session.title)}_${formatDateTime(Date.now()).replace(/[-: ]/g, '')}`
    if (format === 'doc') {
        const filename = `${base}.doc`
        downloadFile(filename, buildSessionHtml(session, true), 'application/msword')
        return filename
    }
    if (format === 'html') {
        const filename = `${base}.html`
        downloadFile(filename, buildSessionHtml(session, false), 'text/html')
        return filename
    }
    const filename = `${base}.md`
    downloadFile(filename, buildSessionMarkdown(session), 'text/markdown')
    return filename
}
