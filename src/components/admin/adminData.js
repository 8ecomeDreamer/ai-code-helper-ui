/**
 * 管理后台演示数据
 * 后端管理接口就绪前，后台各页面以此数据渲染（只读展示）；
 * 接入真实接口时，将各页面的 rows/cards 替换为接口返回即可。
 */

/* ---------------- Dashboard ---------------- */
export const DASHBOARD_STATS = [
  { label: '今日提问', value: '128', delta: '较昨日 +12%' },
  { label: '活跃会话', value: '36', delta: '较昨日 +4' },
  { label: '知识库文档', value: '1,240', delta: '本周新增 26' },
  { label: '图片识别调用', value: '57', delta: '较昨日 +9%' }
]

export const DASHBOARD_INTENT_BARS = [
  { name: '面料识别', percent: 42 },
  { name: '工艺参数', percent: 33 },
  { name: '行业标准', percent: 18 },
  { name: '闲聊兜底', percent: 7 }
]

export const DASHBOARD_TRACES = [
  { time: '09:42', question: '如何鉴别纯棉和涤棉混纺面料？', intent: { text: '面料识别', tag: 'info' }, cost: '1.8s' },
  { time: '09:37', question: '涤棉混纺面料染色需要注意哪些工艺参数？', intent: { text: '工艺参数', tag: 'info' }, cost: '2.4s' },
  { time: '09:31', question: 'GB 18401-2010 安全类别如何划分？', intent: { text: '行业标准', tag: 'info' }, cost: '3.1s' },
  { time: '09:24', question: '这张面料照片是什么组织？', intent: { text: '面料识别', tag: 'info' }, cost: '1.6s' }
]

/* ---------------- 列表页配置 ---------------- */
export const ADMIN_PAGES = {
  /* 后端动态菜单（纺织智能体）对应页面 */
  agentChat: {
    title: 'Agent对话工作台',
    subtitle: '最近对话会话与调用概览（演示数据）',
    searchPlaceholder: '搜索会话 / 用户...',
    searchKeys: ['session', 'username'],
    columns: [
      { key: 'session', label: '会话 ID', strong: true },
      { key: 'username', label: '用户' },
      { key: 'messages', label: '消息数' },
      { key: 'intent', label: '主要意图' },
      { key: 'active', label: '最近活跃' }
    ],
    rows: [
      { session: 'sess-8f2a', username: 'user', messages: 18, intent: '面料识别', active: '09:42' },
      { session: 'sess-7c1d', username: 'user', messages: 12, intent: '工艺参数', active: '09:37' },
      { session: 'sess-6b9e', username: 'guest', messages: 4, intent: '行业标准', active: '09:31' },
      { session: 'sess-5a4b', username: 'admin', messages: 26, intent: '面料识别', active: '09:24' }
    ]
  },
  prompt: {
    title: '提示词模板',
    subtitle: '系统提示词模板版本与启用状态',
    searchPlaceholder: '搜索模板 / 场景...',
    searchKeys: ['name', 'scene'],
    columns: [
      { key: 'name', label: '模板名称', strong: true },
      { key: 'scene', label: '场景' },
      { key: 'version', label: '版本' },
      { key: 'status', label: '状态' },
      { key: 'updated', label: '更新时间' }
    ],
    rows: [
      { name: 'textile-fabric-identify', scene: '面料识别', version: 'v3', status: { text: '启用', tag: 'ok' }, updated: '2026-09-26 14:20' },
      { name: 'textile-process-qa', scene: '工艺问答', version: 'v2', status: { text: '启用', tag: 'ok' }, updated: '2026-09-22 10:08' },
      { name: 'textile-standard-qa', scene: '标准问答', version: 'v2', status: { text: '启用', tag: 'ok' }, updated: '2026-09-22 10:02' },
      { name: 'textile-chat-fallback', scene: '闲聊兜底', version: 'v1', status: { text: '观察', tag: 'warn' }, updated: '2026-09-18 17:45' }
    ]
  },
  vector: {
    title: '向量库管理',
    subtitle: '向量空间集合与索引状态',
    searchPlaceholder: '搜索 Collection...',
    searchKeys: ['collection'],
    columns: [
      { key: 'collection', label: 'Collection', strong: true },
      { key: 'docs', label: '文档数' },
      { key: 'vectors', label: '向量数' },
      { key: 'status', label: '状态' },
      { key: 'rebuilt', label: '最近重建' }
    ],
    rows: [
      { collection: 'textile_rag_store', docs: 1240, vectors: 15832, status: { text: '启用', tag: 'ok' }, rebuilt: '2026-09-28 03:00' },
      { collection: 'textile_fabric_image', docs: 486, vectors: 6120, status: { text: '重建中', tag: 'warn' }, rebuilt: '2026-09-29 08:12' },
      { collection: 'textile_standard_store', docs: 214, vectors: 3057, status: { text: '启用', tag: 'ok' }, rebuilt: '2026-09-27 03:00' }
    ]
  },
  model: {
    title: '模型配置',
    subtitle: '大模型接入参数与启用状态',
    searchPlaceholder: '搜索模型名称 / 编码...',
    searchKeys: ['name', 'code'],
    columns: [
      { key: 'name', label: '模型名称', strong: true },
      { key: 'code', label: '模型编码' },
      { key: 'temperature', label: 'Temperature' },
      { key: 'maxTokens', label: 'Max Tokens' },
      { key: 'status', label: '状态' }
    ],
    rows: [
      { name: 'DeepSeek-R1', code: 'deepseek-r1', temperature: '0.7', maxTokens: 8192, status: { text: '启用', tag: 'ok' } },
      { name: 'qwen-max', code: 'qwen-max', temperature: '0.7', maxTokens: 2048, status: { text: '停用', tag: 'off' } }
    ]
  },
  agentLog: {
    title: 'AI调用日志',
    subtitle: '模型调用审计明细（演示数据）',
    searchPlaceholder: '搜索用户 / 意图...',
    searchKeys: ['username', 'intent'],
    columns: [
      { key: 'time', label: '调用时间', strong: true },
      { key: 'username', label: '用户' },
      { key: 'intent', label: '意图' },
      { key: 'cost', label: '耗时' },
      { key: 'status', label: '状态' }
    ],
    rows: [
      { time: '2026-09-29 09:42', username: 'user', intent: '面料识别', cost: '1.8s', status: { text: '成功', tag: 'ok' } },
      { time: '2026-09-29 09:37', username: 'user', intent: '工艺参数', cost: '2.4s', status: { text: '成功', tag: 'ok' } },
      { time: '2026-09-29 09:31', username: 'guest', intent: '行业标准', cost: '3.1s', status: { text: '超时', tag: 'err' } },
      { time: '2026-09-29 09:24', username: 'admin', intent: '面料识别', cost: '1.6s', status: { text: '成功', tag: 'ok' } }
    ]
  },
  knowledge: {
    title: '知识库管理',
    subtitle: '纺织领域知识库与索引状态总览',
    searchPlaceholder: '搜索知识库名称 / 类别...',
    searchKeys: ['name', 'category'],
    columns: [
      { key: 'name', label: '知识库', strong: true },
      { key: 'category', label: '类别' },
      { key: 'docs', label: '文档数' },
      { key: 'status', label: '状态' },
      { key: 'updated', label: '更新时间' }
    ],
    rows: [
      { name: 'textile-fabric-store', category: '面料', docs: 486, status: { text: '启用', tag: 'ok' }, updated: '2026-09-28 18:20' },
      { name: 'textile-process-store', category: '工艺', docs: 352, status: { text: '启用', tag: 'ok' }, updated: '2026-09-28 16:05' },
      { name: 'textile-standard-store', category: '标准', docs: 214, status: { text: '启用', tag: 'ok' }, updated: '2026-09-27 21:40' },
      { name: 'textile-equipment-store', category: '设备', docs: 188, status: { text: '重建中', tag: 'warn' }, updated: '2026-09-29 08:12' }
    ]
  },
  intents: {
    title: '意图管理',
    subtitle: '问答意图定义与命中情况',
    searchPlaceholder: '搜索意图名称 / 说明...',
    searchKeys: ['name', 'desc'],
    columns: [
      { key: 'name', label: '意图', strong: true },
      { key: 'samples', label: '样例数' },
      { key: 'rate', label: '命中率' },
      { key: 'status', label: '状态' },
      { key: 'desc', label: '说明' }
    ],
    rows: [
      { name: '面料识别', samples: 320, rate: '42%', status: { text: '启用', tag: 'ok' }, desc: '图片 / 文本鉴别面料成分与组织' },
      { name: '工艺参数', samples: 268, rate: '33%', status: { text: '启用', tag: 'ok' }, desc: '纺纱、织造、染整工艺参数咨询' },
      { name: '行业标准', samples: 176, rate: '18%', status: { text: '启用', tag: 'ok' }, desc: '纺织品国标、检测方法查询' },
      { name: '闲聊兜底', samples: 96, rate: '7%', status: { text: '观察', tag: 'warn' }, desc: '非业务问题的兜底回复' }
    ]
  },
  pipelines: {
    title: '流水线管理',
    subtitle: '知识入库流水线的来源与同步策略',
    searchPlaceholder: '搜索流水线 / 数据源...',
    searchKeys: ['name', 'source'],
    columns: [
      { key: 'name', label: '流水线', strong: true },
      { key: 'source', label: '数据源' },
      { key: 'strategy', label: '同步策略' },
      { key: 'status', label: '状态' },
      { key: 'lastRun', label: '最近运行' }
    ],
    rows: [
      { name: 'fabric-docs-ingest', source: '飞书文档', strategy: '增量 · 每小时', status: { text: '运行中', tag: 'ok' }, lastRun: '2026-09-29 09:00' },
      { name: 'standard-pdf-ingest', source: '本地 PDF', strategy: '全量 · 每日', status: { text: '运行中', tag: 'ok' }, lastRun: '2026-09-29 02:00' },
      { name: 'process-web-crawl', source: '网页抓取', strategy: '增量 · 每日', status: { text: '已暂停', tag: 'off' }, lastRun: '2026-09-27 03:00' }
    ]
  },
  tasks: {
    title: '流水线任务',
    subtitle: '最近的知识入库任务执行记录',
    searchPlaceholder: '搜索任务 / 流水线...',
    searchKeys: ['id', 'pipeline'],
    columns: [
      { key: 'id', label: '任务 ID', strong: true },
      { key: 'pipeline', label: '流水线' },
      { key: 'status', label: '状态' },
      { key: 'duration', label: '耗时' },
      { key: 'docs', label: '处理文档' },
      { key: 'started', label: '开始时间' }
    ],
    rows: [
      { id: '#1042', pipeline: 'fabric-docs-ingest', status: { text: '成功', tag: 'ok' }, duration: '3m 12s', docs: 26, started: '09:00' },
      { id: '#1041', pipeline: 'standard-pdf-ingest', status: { text: '成功', tag: 'ok' }, duration: '18m 40s', docs: 214, started: '02:00' },
      { id: '#1040', pipeline: 'fabric-docs-ingest', status: { text: '失败', tag: 'err' }, duration: '1m 03s', docs: 0, started: '08:00' },
      { id: '#1039', pipeline: 'process-web-crawl', status: { text: '成功', tag: 'ok' }, duration: '6m 25s', docs: 41, started: '03:00' }
    ]
  },
  keywords: {
    title: '关键词映射',
    subtitle: '口语词到标准术语的查询改写映射',
    searchPlaceholder: '搜索原始词 / 标准词...',
    searchKeys: ['from', 'to'],
    columns: [
      { key: 'from', label: '原始词', strong: true },
      { key: 'to', label: '标准词' },
      { key: 'category', label: '类别' },
      { key: 'hits', label: '命中次数' }
    ],
    rows: [
      { from: '涤棉', to: 'T/C 混纺', category: '面料', hits: 1284 },
      { from: '全棉', to: '100% 棉', category: '面料', hits: 986 },
      { from: '色牢度', to: '染色牢度', category: '检测', hits: 743 },
      { from: '克重', to: '平方米克重（GSM）', category: '规格', hits: 512 }
    ]
  },
  traces: {
    title: '链路追踪',
    subtitle: '最近问答请求的意图与耗时明细',
    searchPlaceholder: '搜索会话 / 意图...',
    searchKeys: ['session', 'intentText'],
    columns: [
      { key: 'session', label: '会话 ID', strong: true },
      { key: 'intent', label: '意图' },
      { key: 'cost', label: '耗时' },
      { key: 'status', label: '状态' },
      { key: 'time', label: '时间' }
    ],
    rows: [
      { session: 'sess-8f2a', intent: '面料识别', intentText: '面料识别', cost: '1.8s', status: { text: '成功', tag: 'ok' }, time: '09:42' },
      { session: 'sess-7c1d', intent: '工艺参数', intentText: '工艺参数', cost: '2.4s', status: { text: '成功', tag: 'ok' }, time: '09:37' },
      { session: 'sess-6b9e', intent: '行业标准', intentText: '行业标准', cost: '3.1s', status: { text: '超时', tag: 'err' }, time: '09:31' },
      { session: 'sess-5a4b', intent: '面料识别', intentText: '面料识别', cost: '1.6s', status: { text: '成功', tag: 'ok' }, time: '09:24' }
    ]
  },
  users: {
    title: '用户管理',
    subtitle: '账号角色与提问配额（与前端权限模型一致）',
    searchPlaceholder: '搜索用户名 / 昵称...',
    searchKeys: ['username', 'nickname'],
    columns: [
      { key: 'username', label: '用户名', strong: true },
      { key: 'nickname', label: '昵称' },
      { key: 'role', label: '角色' },
      { key: 'quota', label: '提问配额' },
      { key: 'status', label: '状态' },
      { key: 'lastLogin', label: '最近登录' }
    ],
    rows: [
      { username: 'admin', nickname: '管理员', role: { text: '管理员', tag: 'info' }, quota: '不限', status: { text: '启用', tag: 'ok' }, lastLogin: '2026-09-29 09:12' },
      { username: 'user', nickname: '纺织用户', role: '正式用户', quota: '不限', status: { text: '启用', tag: 'ok' }, lastLogin: '2026-09-29 09:02' },
      { username: 'guest', nickname: '体验用户', role: { text: '体验用户', tag: 'warn' }, quota: '10 次 / 日', status: { text: '启用', tag: 'ok' }, lastLogin: '2026-09-29 08:55' }
    ]
  },
  questions: {
    title: '示例问题',
    subtitle: '各模块推荐问法，用于欢迎页与建议卡片',
    searchPlaceholder: '搜索问题 / 模块...',
    searchKeys: ['question', 'module'],
    columns: [
      { key: 'question', label: '示例问题', strong: true },
      { key: 'module', label: '模块' },
      { key: 'category', label: '分类' }
    ],
    rows: [
      { question: '如何鉴别纯棉和涤棉混纺面料？', module: '智能问答', category: '面料识别' },
      { question: '涤棉混纺面料染色需要注意哪些工艺参数？', module: '智能问答', category: '工艺参数' },
      { question: 'GB 18401-2010 对纺织品安全类别是如何划分的？', module: '智能问答', category: '行业标准' },
      { question: '帮我朗读今天的生产简报', module: '语音交互', category: '语音朗读' },
      { question: '识别这张面料照片的组织结构', module: '图片识别', category: '面料识别' }
    ]
  },
  /* ---------------- 系统设置 ---------------- */
  settings: {
    title: '系统配置',
    subtitle: '只读展示当前 application 配置',
    cards: [
      {
        title: '模型与生成配置',
        desc: '大模型与生成参数',
        items: [
          { label: 'Model Name', value: 'qwen-plus' },
          { label: 'Temperature', value: '0.7' },
          { label: 'Max Tokens', value: '2048' }
        ]
      },
      {
        title: 'RAG 默认配置',
        desc: '向量空间与检索基础参数',
        items: [
          { label: 'Collection', value: 'textile_rag_store' },
          { label: 'Dimension', value: '1024' },
          { label: 'Metric Type', value: 'COSINE' }
        ]
      },
      {
        title: '查询改写',
        desc: '历史上下文压缩与改写策略',
        items: [
          { label: 'Enabled', value: { text: '启用', tag: 'ok' } },
          { label: 'Max History Messages', value: '4' },
          { label: 'Max History Chars', value: '500' }
        ]
      },
      {
        title: '全局限流',
        desc: '并发与租户控制',
        items: [
          { label: '单用户 QPS', value: '5' },
          { label: '体验权限日配额', value: '10' },
          { label: '最大并发会话', value: '50' }
        ]
      }
    ]
  }
}
