import { keywordApi, modelApi, logApi, promptApi, chatSessionApi } from '../../api/adminApi.js'

/**
 * 管理后台各模块与后端接口的对接配置
 * 每一项都是要合并进路由 props 的「增量属性」，与 adminData.js 的静态配置共同作用：
 * - resource    后端 CRUD 资源（存在则从接口拉取，忽略静态 rows）
 * - rowMapper   后端记录 -> 表格行（含隐藏键 __id / __raw 供编辑删除使用）
 * - columns     如与静态演示列不匹配则覆盖为真实字段列
 * - formFields  新增/编辑弹窗字段（key 为后端字段名）
 * - payloadMapper 表单值 + 原始记录 -> 提交负载
 */

// 时间格式化：兼容后端返回的时间戳(number)或 ISO 字符串
function fmtDate(value) {
  if (value == null || value === '') return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ---------------- 关键词映射（ai_keyword_mapping）---------------- */
export const KEYWORDS_API_PROPS = {
  resource: keywordApi,
  rowMapper: item => ({
    from: item.original_word,
    to: item.standard_word,
    category: item.category || '',
    hits: item.hit_count == null ? 0 : item.hit_count,
    __id: item.id,
    __raw: item
  }),
  searchKeys: ['from', 'to', 'category'],
  formFields: [
    { key: 'original_word', label: '原始词（用户口语）', type: 'text', required: true },
    { key: 'standard_word', label: '标准术语', type: 'text', required: true },
    { key: 'category', label: '分类', type: 'text' },
    {
      key: 'enable',
      label: '是否启用',
      type: 'select',
      default: 1,
      options: [
        { value: 1, label: '启用' },
        { value: 0, label: '停用' }
      ]
    }
  ],
  canCreate: true,
  canEdit: true,
  canDelete: true
}

/* ---------------- 模型配置（ai_model，结构为推断）---------------- */
export const MODEL_API_PROPS = {
  resource: modelApi,
  rowMapper: item => ({
    name: item.model_name,
    code: item.model_code,
    temperature: item.temperature == null ? '' : String(item.temperature),
    maxTokens: item.max_tokens == null ? '' : item.max_tokens,
    status: item.status === 1 ? { text: '启用', tag: 'ok' } : { text: '停用', tag: 'off' },
    __id: item.id,
    __raw: item
  }),
  searchKeys: ['name', 'code'],
  formFields: [
    { key: 'model_name', label: '模型名称', type: 'text', required: true },
    { key: 'model_code', label: '模型编码', type: 'text', required: true },
    { key: 'base_url', label: '接口地址', type: 'text' },
    { key: 'api_key', label: '密钥', type: 'text' },
    { key: 'temperature', label: 'Temperature', type: 'number' },
    { key: 'max_tokens', label: 'Max Tokens', type: 'number' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      default: 1,
      options: [
        { value: 1, label: '启用' },
        { value: 0, label: '停用' }
      ]
    },
    { key: 'remark', label: '备注', type: 'textarea' }
  ],
  canCreate: true,
  canEdit: true,
  canDelete: true
}

/* ---------------- 链路追踪（ai_business_log）---------------- */
// ai_business_log 无「意图/状态」字段，按其真实列覆盖演示列
export const TRACES_API_PROPS = {
  resource: logApi,
  columns: [
    { key: 'id', label: '日志ID', strong: true },
    { key: 'session', label: '会话ID' },
    { key: 'agent', label: 'Agent' },
    { key: 'logType', label: '类型' },
    { key: 'cost', label: '耗时' },
    { key: 'time', label: '时间' }
  ],
  searchKeys: ['session', 'agent', 'logType'],
  rowMapper: item => ({
    id: item.id,
    session: item.session_id == null ? '' : item.session_id,
    agent: item.agent_name || '',
    logType: item.log_type || '',
    cost: item.cost_ms == null ? '' : `${(item.cost_ms / 1000).toFixed(1)}s`,
    time: fmtDate(item.create_time),
    __id: item.id,
    __raw: item
  }),
  formFields: [
    { key: 'session_id', label: '会话ID', type: 'number' },
    { key: 'message_id', label: '消息ID', type: 'number' },
    { key: 'agent_name', label: 'Agent名称', type: 'text' },
    {
      key: 'log_type',
      label: '日志类型',
      type: 'select',
      options: [
        { value: 'plan', label: 'plan' },
        { value: 'tool_call', label: 'tool_call' },
        { value: 'reflection', label: 'reflection' },
        { value: 'dispatch', label: 'dispatch' }
      ]
    },
    { key: 'cost_ms', label: '耗时(毫秒)', type: 'number' },
    { key: 'log_content', label: '日志详情', type: 'textarea' }
  ],
  canCreate: true,
  canEdit: true,
  canDelete: true
}

/* ---------------- 提示词模板（ai_prompt_template）---------------- */
export const PROMPT_API_PROPS = {
  resource: promptApi,
  columns: [
    { key: 'name', label: '模板名称', strong: true },
    { key: 'agent', label: '对应Agent' },
    { key: 'type', label: '类型' },
    { key: 'version', label: '版本' },
    { key: 'status', label: '状态' },
    { key: 'updated', label: '更新时间' }
  ],
  searchKeys: ['name', 'agent'],
  rowMapper: item => ({
    name: item.template_name,
    agent: item.agent_name || '',
    type: item.prompt_type || '',
    version: item.version == null ? '' : `v${item.version}`,
    status: item.enable === 1 ? { text: '启用', tag: 'ok' } : { text: '停用', tag: 'off' },
    updated: fmtDate(item.update_time),
    __id: item.id,
    __raw: item
  }),
  formFields: [
    { key: 'template_name', label: '模板名称', type: 'text', required: true },
    { key: 'agent_name', label: '对应Agent', type: 'text' },
    {
      key: 'prompt_type',
      label: '模板类型',
      type: 'select',
      options: [
        { value: 'system', label: 'system' },
        { value: 'user', label: 'user' }
      ]
    },
    { key: 'content', label: '提示词内容', type: 'textarea', required: true },
    { key: 'model_id', label: '关联模型ID', type: 'number' },
    {
      key: 'enable',
      label: '是否启用',
      type: 'select',
      default: 1,
      options: [
        { value: 1, label: '启用' },
        { value: 0, label: '停用' }
      ]
    },
    { key: 'sort', label: '排序', type: 'number' },
    { key: 'remark', label: '备注', type: 'textarea' }
  ],
  canCreate: true,
  canEdit: true,
  canDelete: true
}

/* ---------------- Agent对话工作台（ai_chat_session）---------------- */
// ai_chat_session 无「消息数/意图/用户名」字段，按真实列覆盖，仅支持查看与删除
export const AGENT_CHAT_API_PROPS = {
  resource: chatSessionApi,
  columns: [
    { key: 'id', label: '会话ID', strong: true },
    { key: 'title', label: '会话标题' },
    { key: 'user', label: '用户ID' },
    { key: 'model', label: '模型ID' },
    { key: 'status', label: '状态' },
    { key: 'created', label: '创建时间' }
  ],
  searchKeys: ['id', 'title'],
  rowMapper: item => ({
    id: item.id,
    title: item.session_title || '',
    user: item.user_id == null ? '' : item.user_id,
    model: item.model_id == null ? '' : item.model_id,
    status: item.status === 1 ? { text: '正常', tag: 'ok' } : { text: '关闭', tag: 'off' },
    created: fmtDate(item.create_time),
    __id: item.id,
    __raw: item
  }),
  formFields: [
    { key: 'session_title', label: '会话标题', type: 'text' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      default: 1,
      options: [
        { value: 1, label: '正常' },
        { value: 0, label: '关闭' }
      ]
    },
    { key: 'remark', label: '备注', type: 'textarea' }
  ],
  canCreate: false,
  canEdit: true,
  canDelete: true
}
