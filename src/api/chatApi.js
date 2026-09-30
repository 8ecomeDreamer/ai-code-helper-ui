import axios from 'axios'

// 统一使用相对路径 /api：
// - 开发环境由 Vite server.proxy 转发到 http://localhost:8081（见 vite.config.js）
// - 生产环境由 Nginx 同域转发到后端服务
const API_BASE_URL = '/api'

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
            const data = event.data
            if (data && data.trim() !== '') {
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
 * 调用图片内容识别接口
 * @param {File} file 图片文件
 * @returns {Promise<string>} 识别结果文本（Markdown）
 */
export async function recognizeImage(file) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(`${API_BASE_URL}/ai/image/recognize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
    })

    const data = response.data
    if (typeof data === 'string') return data
    return data.data || data.message || JSON.stringify(data)
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
