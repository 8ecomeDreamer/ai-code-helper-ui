/**
 * 本地 Mock 后端服务（仅用于前端联调与演示）
 *
 * 启动方式：node mock/mock-server.mjs
 * 契约与真实后端（ai-code-helper，若依风格 AjaxResult）保持一致：
 *   POST /api/login       登录，返回 { code, msg, token }
 *   GET  /api/getInfo     用户信息，返回 { code, msg, user, roles, permissions }
 *   GET  /api/getRouters  动态菜单，返回 { code, msg, data: RouterVo[] }
 *   POST /api/logout      退出，返回 { code, msg }
 *   GET  /api/ai/chat             SSE 流式回复
 *   POST /api/ai/image/recognize  图片识别（返回示例 Markdown）
 *   GET  /api/health              健康检查
 *
 * 账号 / 角色 / 权限 / 菜单与后端 sql/init_data.sql 种子数据一致：
 *   admin  超级管理员（*:*:*，全部菜单）
 *   user   纺织AI业务用户（对话/知识库/提示词/调用日志）
 *   guest  体验访客（仅对话工作台）
 */
import http from 'node:http'

// 与 vite.config.js 代理 target 保持一致；真实后端占用该端口时停止本服务即可
const PORT = 8881

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

const ACCOUNTS = {
    admin: { password: 'admin123', role: 'admin', nickname: '系统管理员' },
    user: { password: 'user123', role: 'user', nickname: '正式业务用户' },
    guest: { password: 'guest123', role: 'guest', nickname: '体验访客' }
}

// 后端角色标识（sys_role.role_key）
const ROLE_KEYS = {
    admin: 'admin',
    user: 'textile_biz',
    guest: 'textile_guest'
}

// 菜单权限标识集合（sys_menu.perms，与 init_data.sql 角色菜单关联一致）
const ROLE_PERMS = {
    admin: ['*:*:*'],
    user: [
        'agent:chat:list', 'agent:chat:query', 'agent:chat:add', 'agent:chat:remove',
        'agent:knowledge:list', 'agent:knowledge:query', 'agent:knowledge:edit',
        'agent:knowledge:remove', 'agent:knowledge:upload',
        'agent:prompt:list', 'agent:log:list'
    ],
    guest: ['agent:chat:list', 'agent:chat:query', 'agent:chat:add']
}

// 纺织智能体二级菜单定义（path / 标题 / 图标 / 组件）
const AGENT_MENUS = [
    { path: 'chat', title: 'Agent对话工作台', icon: 'message' },
    { path: 'knowledge', title: '知识库管理', icon: 'book' },
    { path: 'prompt', title: '提示词模板', icon: 'edit' },
    { path: 'vector', title: '向量库管理', icon: 'database' },
    { path: 'model', title: '模型配置', icon: 'cpu' },
    { path: 'agentLog', title: 'AI调用日志', icon: 'log' }
]

// 角色可见菜单（与 sys_role_menu 关联一致：admin 全部、user 四个、guest 仅对话）
const ROLE_MENU_PATHS = {
    admin: AGENT_MENUS.map(menu => menu.path),
    user: ['chat', 'knowledge', 'prompt', 'agentLog'],
    guest: ['chat']
}

function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify(payload))
}

// 若依风格成功返回包
function ok(data, msg = '操作成功') {
    return data === undefined ? { code: 200, msg } : { code: 200, msg, data }
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

// 构造若依风格动态菜单树（RouterVo）
function buildRouters(role) {
    const children = AGENT_MENUS.filter(menu => ROLE_MENU_PATHS[role].includes(menu.path))
        .map(menu => ({
            name: menu.path.charAt(0).toUpperCase() + menu.path.slice(1),
            path: menu.path,
            component: `agent/${menu.path}/index`,
            meta: { title: menu.title, icon: menu.icon, noCache: false }
        }))
    if (!children.length) return []
    return [
        {
            name: 'Agent',
            path: '/agent',
            component: 'Layout',
            alwaysShow: true,
            redirect: 'noRedirect',
            children
        }
    ]
}

// 将全文切成流式增量块（模拟打字机效果，块边界可落在任意字符处）。
// 下发时经 JSON 封装为 {"d":"..."} 帧，换行/空白完整保留，
// 规避 SSE 规范剥离帧尾换行、纯空白帧无法传递的限制（前端 chatApi.decodeChunk 对应解码）
function buildSseChunks(text) {
    return text.match(/[\s\S]{1,6}/g) || []
}

function sendSse(res, message) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream;charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    })

    // 帧内换行逐行加 data: 前缀，符合 SSE 规范，避免续行被 EventSource 丢弃
    const chunks = buildSseChunks(REPLY)
    let index = 0
    const timer = setInterval(() => {
        if (index >= chunks.length) {
            clearInterval(timer)
            res.end()
            return
        }
        // JSON 帧：换行经转义保留，且帧数据不含裸换行，无需多 data 行
        res.write(`data: ${JSON.stringify({ d: chunks[index] })}\n\n`)
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

    if (req.method === 'POST' && url.pathname === '/api/login') {
        const raw = await readBody(req)
        let body = {}
        try {
            body = JSON.parse(raw.toString('utf-8') || '{}')
        } catch (error) {
            /* 忽略非法 JSON */
        }
        const account = ACCOUNTS[body.username]
        if (!account || account.password !== body.password) {
            // 与后端一致：业务失败为 HTTP 200 + code 500
            sendJson(res, 200, { code: 500, msg: '用户不存在或密码错误' })
            return
        }
        console.log('[mock] login:', body.username, account.role)
        sendJson(res, 200, { code: 200, msg: '登录成功', token: `mock-${account.role}-${Date.now()}` })
        return
    }

    if (req.method === 'GET' && url.pathname === '/api/getInfo') {
        const identity = parseToken(req)
        if (!identity) {
            sendJson(res, 401, { code: 401, msg: '登录状态已过期或访问未授权，请重新登录' })
            return
        }
        sendJson(res, 200, {
            code: 200,
            msg: '操作成功',
            user: {
                user_id: Object.keys(ACCOUNTS).indexOf(identity.username) + 1,
                user_name: identity.username,
                nick_name: identity.nickname,
                status: '0',
                del_flag: '0'
            },
            roles: [ROLE_KEYS[identity.role]],
            permissions: ROLE_PERMS[identity.role]
        })
        return
    }

    if (req.method === 'GET' && url.pathname === '/api/getRouters') {
        const identity = parseToken(req)
        if (!identity) {
            sendJson(res, 401, { code: 401, msg: '登录状态已过期或访问未授权，请重新登录' })
            return
        }
        sendJson(res, 200, ok(buildRouters(identity.role)))
        return
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
        sendJson(res, 200, ok(undefined, '退出成功'))
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
        sendJson(res, 200, { status: 'UP' })
        return
    }

    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' })
    res.end('Not Found')
})

server.listen(PORT, () => {
    console.log(`Mock 后端已启动: http://localhost:${PORT}`)
})
