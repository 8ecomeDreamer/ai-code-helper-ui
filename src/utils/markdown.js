import { marked } from 'marked'

// 全局配置 marked 选项
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true // 支持 GitHub 风格的 Markdown
})

/**
 * 渲染 Markdown 为 HTML
 * @param {string} text Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(text) {
  if (!text) return ''
  return marked(text)
}

/**
 * 将 Markdown 转为适合语音朗读的纯文本
 * @param {string} md Markdown 文本
 * @returns {string} 纯文本
 */
export function plainText(md) {
  if (!md) return ''
  return md
    .replace(/```[\s\S]*?```/g, ' 代码块 ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' 图片 ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
