/**
 * 本地 Mock 后端服务（仅用于前端联调与演示）
 *
 * 启动方式：node mock/mock-server.mjs
 * 提供接口：
 *   POST /api/auth/login          登录（返回 token 与用户信息，含角色权限）
 *   GET  /api/auth/info           当前用户信息（Bearer token 校验）
 *   POST /api/auth/logout         退出登录
 *   GET  /api/ai/chat             SSE 流式回复
 *   POST /api/ai/image/recognize  图片识别（返回示例 Markdown）
 *   GET  /api/health              健康检查
 */
import http from 'node:http'

const PORT = 8081

const REPLY = `## 回答示例

这是一条来自 **Mock 后端** 的流式回复，用于前端联调验证。

### 要点
- 支持 SSE 逐字输出
- 支持 Markdown 渲染
- 支持表格与代码块

| 项目 | 说明 |
| --- | --- |
| 接口 | /api/ai/chat |
| 协议 | text/event-stream |

\`\`\`js
// 示例代码块
console.log('hello textile')
\`\`\`

> 提示：启动真实后端后，本服务即可停止。
`

// 鉴权接口契约（后端实现参考）：登录返回 { token, user: { username, nickname, role } }
const ACCOUNTS = {
    admin: { password: 'admin123', role: 'admin', nickname: '管理员' },
    user: { password: 'user123', role: 'user', nickname: '纺织用户' },
    guest: { password: 'guest123', role: 'guest', nickname: '体验用户' }
}

function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify(payload))
}

// 从 Authorization: Bearer <token> 解析角色
function parseToken(req) {
    const header = req.headers.authorization || ''
    const token = header.replace(/^Bearer\s+/i, '')
    const role = token.split('-')[1]
    const entry = Object.entries(ACCOUNTS).find(([, value]) => value.role === role)
    if (!entry) return null
    return { username: entry[0], role, nickname: entry[1].nickname }
}

function sendSse(res, message) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream;charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    })

    // 按小块逐步推送，模拟打字机效果
    const chunks = REPLY.match(/[\s\S]{1,6}/g) || []
    let index = 0
    const timer = setInterval(() => {
        if (index >= chunks.length) {
            clearInterval(timer)
            res.end()
            return
        }
        res.write(`data: ${chunks[index]}\n\n`)
        index++
    }, 30)

    res.on('close', () => clearInterval(timer))
}

function readBody(req) {
    return new Promise(resolve => {
        const parts = []
        req.on('data', chunk => parts.push(chunk))
        req.on('end', () => resolve(Buffer.concat(parts)))
    })
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        })
        res.end()
        return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const raw = await readBody(req)
        let body = {}
        try {
            body = JSON.parse(raw.toString('utf-8') || '{}')
        } catch (error) {
            /* 忽略非法 JSON */
        }
        const account = ACCOUNTS[body.username]
        if (!account || account.password !== body.password) {
            sendJson(res, 401, { message: '用户名或密码错误' })
            return
        }
        console.log('[mock] login:', body.username, account.role)
        sendJson(res, 200, {
            token: `mock-${account.role}-${Date.now()}`,
            user: { username: body.username, nickname: account.nickname, role: account.role }
        })
        return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/info') {
        const user = parseToken(req)
        if (!user) {
            sendJson(res, 401, { message: '登录态已失效，请重新登录' })
            return
        }
        sendJson(res, 200, user)
        return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
        sendJson(res, 200, { success: true })
        return
    }

    if (req.method === 'GET' && url.pathname === '/api/ai/chat') {
        const message = url.searchParams.get('message') || ''
        console.log('[mock] chat:', message)
        sendSse(res, message)
        return
    }

    if (req.method === 'POST' && url.pathname === '/api/ai/image/recognize') {
        await readBody(req)
        const body = JSON.stringify({
            data: '## 识别结果（Mock）\n\n- 面料类别：平纹机织物\n- 推测成分：棉 65% / 涤纶 35%\n- 组织特征：经纬纱线密度均匀，表面平整\n\n> 该结果由 Mock 服务返回，仅供界面联调。'
        })
        res.writeHead(200, {
            'Content-Type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        })
        res.end(body)
        return
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
        res.writeHead(200, {
            'Content-Type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        })
        res.end(JSON.stringify({ status: 'UP' }))
        return
    }

    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
    res.end('Not Found')
})

server.listen(PORT, () => {
    console.log(`Mock 后端已启动: http://localhost:${PORT}`)
})
