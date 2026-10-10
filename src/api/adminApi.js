import axios from 'axios'
import { TOKEN_KEY } from './authApi.js'

/**
 * 管理后台通用接口封装
 * - 后端 context-path 为 /api，开发环境经 Vite 代理、生产经 Nginx 同域转发
 * - 统一携带 JWT（Bearer），令牌取自登录态 localStorage
 * - 兼容两种返回体：
 *   1) 若依风格信封 { code, msg, data }（新增的 /agent/* 接口）
 *   2) 裸数据 List / boolean（既有的 /prompt-template、/chat-session 接口）
 */
const API_BASE_URL = '/api'
const CODE_SUCCESS = 200

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// 判断是否为 { code, msg, ... } 信封（数组不算信封）
function isEnvelope(payload) {
  return !!payload && typeof payload === 'object' && !Array.isArray(payload) && 'code' in payload
}

// 取数据：信封校验 code 后返回 data，否则原样返回（裸 List）
function unwrapData(response) {
  const payload = response.data
  if (isEnvelope(payload)) {
    if (payload.code !== CODE_SUCCESS) {
      const error = new Error(payload.msg || '请求失败')
      error.business = true
      throw error
    }
    return payload.data
  }
  return payload
}

// 取操作结果：信封校验 code，裸 boolean 校验真假
function unwrapOk(response) {
  const payload = response.data
  if (isEnvelope(payload)) {
    if (payload.code !== CODE_SUCCESS) {
      const error = new Error(payload.msg || '操作失败')
      error.business = true
      throw error
    }
    return true
  }
  if (payload === false) {
    const error = new Error('操作失败')
    error.business = true
    throw error
  }
  return true
}

/**
 * 构建一个标准 CRUD 资源
 * @param {string} base     资源基础路径（相对 /api），如 /agent/keyword
 * @param {string} listPath 列表子路径，默认 /list；既有接口传 '' 表示 GET 根路径
 */
export function buildResource({ base, listPath = '/list' }) {
  const listUrl = `${API_BASE_URL}${base}${listPath}`
  const itemUrl = id => `${API_BASE_URL}${base}/${id}`
  const baseUrl = `${API_BASE_URL}${base}`
  return {
    list: async params =>
      unwrapData(await axios.get(listUrl, { params, headers: authHeaders(), timeout: 10000 })),
    get: async id =>
      unwrapData(await axios.get(itemUrl(id), { headers: authHeaders(), timeout: 10000 })),
    create: async data =>
      unwrapOk(await axios.post(baseUrl, data, { headers: authHeaders(), timeout: 10000 })),
    update: async data =>
      unwrapOk(await axios.put(baseUrl, data, { headers: authHeaders(), timeout: 10000 })),
    remove: async id =>
      unwrapOk(await axios.delete(itemUrl(id), { headers: authHeaders(), timeout: 10000 }))
  }
}

/* ---------------- 各模块资源 ---------------- */
// 关键词映射（新表 ai_keyword_mapping）
export const keywordApi = buildResource({ base: '/agent/keyword' })
// 模型配置（新表 ai_model）
export const modelApi = buildResource({ base: '/agent/model' })
// 链路追踪 / AI 调用日志（新表 ai_business_log）
export const logApi = buildResource({ base: '/agent/log' })
// 提示词模板（既有 ai_prompt_template，GET 根路径返回列表）
export const promptApi = buildResource({ base: '/prompt-template', listPath: '' })
// Agent 对话会话（既有 ai_chat_session，GET 根路径返回列表）
export const chatSessionApi = buildResource({ base: '/chat-session', listPath: '' })

/**
 * 通用文件上传（MinIO）
 * @param {File} file   文件对象
 * @param {string} prefix 目录前缀，如 knowledge/pdf
 * @returns {Promise<{objectKey:string,url:string,originalName:string,size:number}>}
 */
export async function uploadFile(file, prefix) {
  const form = new FormData()
  form.append('file', file)
  if (prefix) form.append('prefix', prefix)
  const response = await axios.post(`${API_BASE_URL}/file/upload`, form, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
  return unwrapData(response)
}
