/**
 * 竞品调研模块工具
 *
 * 真实能力由后端 Agent + 联网搜索 MCP（百度 ai_search）聚合面料行情（价格/网址/新闻等），
 * 前端请求 /api/research/fabric?keyword=xxx 获取结构化比价报告。
 */
import { searchCompetitors as searchCompetitorsRemote } from '../api/bizApi.js'

/**
 * 按面料关键词检索竞品行情（调用后端联网调研接口）。
 * @param {string} keyword 用户输入的面料关键词
 * @returns {Promise<Object|null>} { fabric, competitors, analysis } 或 null（无结果）
 */
export async function searchCompetitors(keyword) {
  const kw = String(keyword || '').trim()
  if (!kw) return null
  const remote = await searchCompetitorsRemote(kw)
  if (remote && Array.isArray(remote.competitors) && remote.competitors.length) {
    return remote
  }
  return null
}

// 热门面料快捷入口
export const HOT_KEYWORDS = ['全棉府绸', '涤棉纱卡', '春亚纺', '弹力牛仔布']
