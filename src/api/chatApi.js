import axios from 'axios'
import { TOKEN_KEY } from './authApi.js'

// 统一使用相对路径 /api：
// - 开发环境由 Vite server.proxy 转发到 http://localhost:8881（见 vite.config.js）
// - 生产环境由 Nginx 同域转发到后端服务
const API_BASE_URL = '/api'

// 解析流式帧：兼容 JSON 帧（{"d":"增量文本"}，可携带换行/空白）与纯文本帧（真实后端逐 token 下发）。
// SSE 规范会剥离帧数据末尾换行，纯空白帧无法经 data 传递，JSON 封装可完整保留换行结构
function decodeChunk(raw) {
    const text = String(raw)
    const trimmed = text.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed)
            if (parsed && typeof parsed.d === 'string') return parsed.d
        } catch (error) {
            /* 非 JSON 帧，按原文处理 */
        }
    }
    return text
}

/**
 * 使用 SSE 方式调用聊天接口
 *
 * 结束语义说明：EventSource 没有 onclose 事件，且流结束后浏览器会自动重连，
 * 因此这里在 onerror 中统一判定结束时机并主动关闭连接：
 * - 已收到过内容后连接断开 => 正常结束（onClose）
 * - 未收到任何内容连接即断开 => 请求失败（onError）
 *
 * @param {number} memoryId 聊天室ID
 * @param {string} message 用户消息
 * @param {Function} onMessage 接收消息的回调函数
 * @param {Function} onError 错误处理回调函数
 * @param {Function} onClose 连接关闭回调函数
 * @returns {EventSource} 返回 EventSource 对象，用于手动关闭连接
 */
export function chatWithSSE(memoryId, message, onMessage, onError, onClose) {
    // 构建URL参数
    const params = new URLSearchParams({
        memoryId: memoryId,
        message: message
    })
    // EventSource 无法携带请求头：登录态下以 token 查询参数传递，
    // 后端 /ai/** 可选鉴权拦截器据此记名（会话归属用户），匿名时不追加
    const sseToken = localStorage.getItem(TOKEN_KEY)
    if (sseToken) params.set('token', sseToken)

    // 创建 EventSource 连接
    const eventSource = new EventSource(`${API_BASE_URL}/ai/chat?${params}`)

    let receivedAny = false
    let finished = false

    // 统一结束入口：只触发一次回调，并主动关闭连接防止自动重连重复请求
    const finish = (callback, arg) => {
        if (finished) return
        finished = true
        if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close()
        }
        callback && callback(arg)
    }

    // 处理接收到的消息
    eventSource.onmessage = function(event) {
        try {
            const data = decodeChunk(event.data)
            // 仅跳过解码后仍为空的帧（心跳）；含换行/空白的帧是正文换行结构，不可丢弃
            if (data) {
                receivedAny = true
                onMessage(data)
            }
        } catch (error) {
            console.error('解析消息失败:', error)
            finish(onError, error)
        }
    }

    // 处理错误 / 连接结束
    eventSource.onerror = function(error) {
        console.log('SSE 连接状态:', eventSource.readyState)
        if (receivedAny) {
            // 已收到内容：流式回复结束或中途断开，按正常结束处理
            console.log('SSE 连接结束，已接收内容')
            finish(onClose)
        } else if (eventSource.readyState === EventSource.CLOSED) {
            // 未收到内容且连接已关闭：后端未启动 / 接口异常
            console.error('SSE 连接失败:', error)
            finish(onError, error)
        } else {
            // 未收到内容且即将自动重连：主动结束，避免重复发起请求
            console.error('SSE 连接错误:', error)
            finish(onError, error)
        }
    }

    return eventSource
}

/**
 * 带附件的聊天：POST multipart /ai/chat（携带图片/文件），服务端返回 SSE 流。
 * 回调契约与 chatWithSSE 一致：onMessage / onError / onClose。
 * @returns {Function} close() 用于中断请求
 */
export function chatWithAttachments(memoryId, message, images, files, onMessage, onError, onClose) {
    const controller = new AbortController()
    const token = localStorage.getItem(TOKEN_KEY)

    const formData = new FormData()
    formData.append('memoryId', String(memoryId))
    formData.append('message', message || '')
    if (images && images.length) {
        for (const img of images) formData.append('images', img, img.name || 'image.png')
    }
    if (files && files.length) {
        for (const f of files) formData.append('files', f, f.name || 'file')
    }

    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    let finished = false
    const finish = (cb, arg) => {
        if (finished) return
        finished = true
        cb && cb(arg)
    }

    fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
    }).then(response => {
        if (!response.ok) {
            finish(onError, new Error(`HTTP ${response.status}`))
            finish(onClose)
            return
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        function pump() {
            reader.read().then(({ done, value }) => {
                if (done) { finish(onClose); return }
                buffer += decoder.decode(value, { stream: true })
                // 解析 SSE 帧（以双换行分隔）
                const frames = buffer.split('\n\n')
                buffer = frames.pop()
                for (const frame of frames) {
                    // 兼容 "data:xxx" 和裸文本帧
                    const line = frame.startsWith('data:') ? frame.slice(5).trim() : frame.trim()
                    if (line) {
                        const decoded = decodeChunk(line)
                        if (decoded) onMessage(decoded)
                    }
                }
                pump()
            }).catch(err => {
                if (err.name === 'AbortError') return
                finish(onError, err)
                finish(onClose)
            })
        }
        pump()
    }).catch(err => {
        if (err.name === 'AbortError') return
        finish(onError, err)
        finish(onClose)
    })

    return () => controller.abort()
}

/**
 * 通用文件上传（后端 /api/file/upload，MinIO 对象存储）
 * 保留供其他模块使用（面料识别等），聊天附件已改走 chatWithAttachments 直发 Agent。
 */
export async function uploadFile(file, prefix = 'common') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('prefix', prefix)

    // /file/** 需登录态，统一携带 JWT（Bearer）
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = { 'Content-Type': 'multipart/form-data' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await axios.post(`${API_BASE_URL}/file/upload`, formData, {
        headers,
        timeout: 60000
    })

    const data = response.data
    // 后端统一响应体 { code, msg, data }
    if (data && data.code !== undefined && data.code !== 200 && data.code !== 0) {
        throw new Error(data.msg || data.message || '上传失败')
    }
    return data.data || data
}

/**
 * 语音识别：上传 wav 音频 Blob（16k 单声道，见 utils/audio.js），返回识别文本。
 * 走 /ai/asr（免鉴权），后端调百炼 paraformer 同步识别。
 * @param {Blob} wavBlob WAV 音频 Blob
 * @returns {Promise<string>} 识别出的文本
 */
export async function recognizeSpeech(wavBlob) {
    const formData = new FormData()
    formData.append('file', wavBlob, 'speech.wav')

    const response = await axios.post(`${API_BASE_URL}/ai/asr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
    })

    const data = response.data
    // Result 信封 { code, msg, data: { text } }
    if (data && data.code !== undefined && data.code !== 200 && data.code !== 0) {
        throw new Error(data.msg || '语音识别失败')
    }
    return (data && data.data && data.data.text) || ''
}

/**
 * 检查后端服务是否可用
 * @returns {Promise<boolean>} 返回服务是否可用
 */
export async function checkServiceHealth() {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`, {
            timeout: 5000
        })
        return response.status === 200
    } catch (error) {
        console.error('服务健康检查失败:', error)
        return false
    }
}

/* ---------------- 聊天历史（后端 /chat-session、/chat-message，需登录态） ---------------- */
// 这两个控制器直接返回裸 JSON（数组/实体），非 Result 包装
async function authJson(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = { ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
}

/**
 * 拉取当前登录用户的会话列表（侧边栏历史）
 * @returns {Promise<Array>} ai_chat_session 列表（id 倒序）
 */
export function fetchMySessions() {
    return authJson('/chat-session/my')
}

/**
 * 拉取会话历史消息（含附件与 MinIO 临时预览链接）
 * @param {number} sessionId 会话id（memoryId）
 * @returns {Promise<Array>} ChatMessageVo 列表（时间正序）
 */
export function fetchSessionHistory(sessionId) {
    return authJson(`/chat-message/history/${sessionId}`)
}

/**
 * 删除云端会话（本地删除时同步清理数据库行）
 * @param {number} sessionId 会话id
 */
export function deleteChatSession(sessionId) {
    return authJson(`/chat-session/${sessionId}`, { method: 'DELETE' })
}
