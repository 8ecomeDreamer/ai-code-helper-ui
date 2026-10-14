import axios from 'axios'
import { TOKEN_KEY } from './authApi.js'

/**
 * 纺织业务模块接口封装（智能报价 / 竞品调研 / 合规校验 / 面料识别 / 意图路由）
 *
 * - 后端 context-path 为 /api，开发环境经 Vite 代理、生产经 Nginx 同域转发
 * - 业务接口需登录态，统一携带 JWT（Bearer）；/ai/route 为公开入口
 * - 后端统一返回若依风格信封 { code, msg, data }，此处解包 data
 */
const API_BASE_URL = '/api'
const CODE_SUCCESS = 200

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 解包信封：校验 code 后返回 data；非信封则原样返回
function unwrapData(response) {
  const payload = response.data
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'code' in payload) {
    if (payload.code !== CODE_SUCCESS) {
      const error = new Error(payload.msg || '请求失败')
      error.business = true
      throw error
    }
    return payload.data
  }
  return payload
}

/**
 * 智能报价：拉取 ERP 面料成本数据（确定性接口，非 Agent）
 * @returns {Promise<Array>} 面料列表
 */
export async function fetchErpFabrics() {
  return unwrapData(await axios.get(`${API_BASE_URL}/erp/fabric/list`, {
    headers: authHeaders(),
    timeout: 15000
  }))
}

/**
 * 智能报价：由 Agent 生成多语言报价邮件
 * @param {Object} quote    computeQuote 的完整结果
 * @param {string} lang     zh / en / both
 * @param {string} customer 客户称呼
 * @returns {Promise<string>} 邮件 Markdown 文本
 */
export async function generateQuoteEmail(quote, lang, customer) {
  return unwrapData(await axios.post(
    `${API_BASE_URL}/quote/email`,
    { quote, lang, customer },
    { headers: authHeaders(), timeout: 90000 }
  ))
}

/**
 * 竞品调研：Agent + 联网搜索 MCP 聚合面料行情
 * @param {string} keyword 面料关键词
 * @returns {Promise<Object|null>} { fabric, competitors, analysis, demo } 或 null
 */
export async function searchCompetitors(keyword) {
  const data = unwrapData(await axios.get(`${API_BASE_URL}/research/fabric`, {
    params: { keyword },
    headers: authHeaders(),
    timeout: 120000
  }))
  return data || null
}

/**
 * 合规校验：上传文档（txt/md/pdf）或粘贴条款文本，由大模型深度审查
 * @param {{file?: File, text?: string}} payload 二选一
 * @returns {Promise<Object>} { items, risks, summary } 校验报告
 */
export async function checkComplianceDoc({ file, text }) {
  const form = new FormData()
  if (file) form.append('file', file)
  if (text) form.append('text', text)
  return unwrapData(await axios.post(`${API_BASE_URL}/compliance/check`, form, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  }))
}

/**
 * 面料识别：视觉模型检测疵点（非面料图片返回 status=error）
 * @param {File} file 面料图片
 * @returns {Promise<Object>} { status, title, message, report? }
 */
export async function detectFabricDefect(file) {
  const form = new FormData()
  form.append('file', file)
  return unwrapData(await axios.post(`${API_BASE_URL}/fabric/defect/detect`, form, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  }))
}

/**
 * 总路由：识别用户请求意图，返回应转发到的专属子 Agent / 接口
 * @param {string} message 用户自然语言请求
 * @returns {Promise<Object>} { intent, label, endpoint, suggestion }
 */
export async function routeIntent(message) {
  return unwrapData(await axios.get(`${API_BASE_URL}/ai/route`, {
    params: { message },
    timeout: 30000
  }))
}
