import { downloadFile, formatDateTime, sanitizeFilename } from './index.js'

/**
 * 智能报价模块工具
 *
 * 数据链路：ERP 面料成本数据 -> 报价计算 -> 多语言报价邮件（Markdown）-> 导出 md / 打印 pdf
 * 说明：ERP_FABRICS 为前端内置演示数据，待后端 ERP 接口（如 /api/erp/fabric/list）
 * 就绪后替换 fetchErpFabrics 的实现即可，页面无需改动。
 */

/* ---------------- ERP 演示数据（待后端对接） ---------------- */

// 演示用汇率（USD -> CNY）
export const USD_CNY_RATE = 7.2

export const ERP_FABRICS = [
  {
    code: 'ERP-CT-001',
    name: '全棉平纹府绸',
    nameEn: 'Cotton Poplin',
    spec: 'C 100% · 40s×40s · 133×72',
    weight: '120 g/m²',
    width: '57/58"',
    cost: { material: 6.8, process: 2.1, dyeing: 1.6, test: 0.4, packing: 0.3 },
    moq: 1000,
    leadTime: 15
  },
  {
    code: 'ERP-TC-002',
    name: '涤棉斜纹纱卡',
    nameEn: 'T/C Twill',
    spec: 'T65/C35 · 21s×21s · 108×58',
    weight: '180 g/m²',
    width: '58/59"',
    cost: { material: 5.9, process: 2.4, dyeing: 1.8, test: 0.4, packing: 0.3 },
    moq: 1500,
    leadTime: 18
  },
  {
    code: 'ERP-PL-003',
    name: '涤纶春亚纺',
    nameEn: 'Polyester Pongee',
    spec: 'P 100% · 75D×150D · 平纹',
    weight: '65 g/m²',
    width: '57"',
    cost: { material: 2.6, process: 1.2, dyeing: 1.0, test: 0.3, packing: 0.2 },
    moq: 2000,
    leadTime: 12
  },
  {
    code: 'ERP-SP-004',
    name: '弹力色织牛仔布',
    nameEn: 'Stretch Denim',
    spec: 'C98/SP2 · 10s+70D · 3/1 斜纹',
    weight: '340 g/m²',
    width: '52"',
    cost: { material: 12.4, process: 4.2, dyeing: 3.6, test: 0.5, packing: 0.5 },
    moq: 800,
    leadTime: 25
  },
  {
    code: 'ERP-OR-005',
    name: 'CVC 牛津纺',
    nameEn: 'CVC Oxford',
    spec: 'C60/T40 · 40s×21s · 牛津组织',
    weight: '140 g/m²',
    width: '58"',
    cost: { material: 5.2, process: 2.0, dyeing: 1.5, test: 0.4, packing: 0.3 },
    moq: 1200,
    leadTime: 16
  }
]

/**
 * 获取 ERP 面料数据（当前返回内置演示数据；待后端对接后改为请求 ERP 接口）
 * @returns {Promise<Array>} 面料列表
 */
export async function fetchErpFabrics() {
  // TODO: 后端对接 - 替换为 axios.get('/api/erp/fabric/list')
  return Promise.resolve(ERP_FABRICS)
}

/* ---------------- 报价计算 ---------------- */

// 数量阶梯折扣（米数 -> 折扣率）
const VOLUME_DISCOUNTS = [
  { min: 10000, rate: 0.97 },
  { min: 5000, rate: 0.98 },
  { min: 0, rate: 1 }
]

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: '美元 USD' },
  { code: 'CNY', symbol: '¥', label: '人民币 CNY' }
]

export const TRADE_TERMS = ['FOB Shanghai', 'FOB Ningbo', 'CIF New York', 'CIF Hamburg', 'EXW Factory']

/**
 * 根据面料成本与参数计算报价明细
 * @param {Object} options 报价参数
 * @returns {Object} 报价结果（含成本合计、单价、总价、折扣说明）
 */
export function computeQuote({ fabric, quantity, marginPct, currency, tradeTerm }) {
  const costCny =
    fabric.cost.material + fabric.cost.process + fabric.cost.dyeing + fabric.cost.test + fabric.cost.packing
  // 利润率加成
  let unitCny = costCny * (1 + marginPct / 100)
  // 数量阶梯折扣
  const tier = VOLUME_DISCOUNTS.find(item => quantity >= item.min)
  const discountRate = tier ? tier.rate : 1
  unitCny *= discountRate
  // 汇率换算
  const rate = currency === 'USD' ? USD_CNY_RATE : 1
  const unitPrice = unitCny / rate
  const symbol = currency === 'USD' ? '$' : '¥'

  return {
    fabric,
    quantity,
    marginPct,
    currency,
    symbol,
    tradeTerm,
    costCny,
    discountRate,
    discountPct: Math.round((1 - discountRate) * 100),
    unitPrice,
    totalAmount: unitPrice * quantity,
    unitCostPrice: costCny / rate,
    leadTime: fabric.leadTime,
    moq: fabric.moq,
    belowMoq: quantity < fabric.moq
  }
}

export function formatMoney(value, symbol) {
  return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ---------------- 多语言报价邮件 ---------------- */

// 客户称呼会进入邮件正文与打印 HTML，统一转义防止注入
export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const EMAIL_LANGUAGES = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'both', label: '中英双语' }
]

// 邮件正文模板（返回 Markdown 文本）
function buildZhEmail(quote, customer) {
  const { fabric } = quote
  const lines = [
    `**主题：${fabric.name} 报价单（${quote.tradeTerm}）**`,
    '',
    `尊敬的 ${customer || '客户'}：`,
    '',
    '您好！感谢您对我司产品的关注，现将您询价的面料报价如下：',
    '',
    `| 项目 | 内容 |`,
    `| --- | --- |`,
    `| 品名 | ${fabric.name}（${fabric.nameEn}） |`,
    `| 规格 | ${fabric.spec} |`,
    `| 克重 / 幅宽 | ${fabric.weight} / ${fabric.width} |`,
    `| 数量 | ${quote.quantity.toLocaleString()} 米 |`,
    `| 单价 | ${formatMoney(quote.unitPrice, quote.symbol)}/米（${quote.tradeTerm}） |`,
    `| 总金额 | ${formatMoney(quote.totalAmount, quote.symbol)} |`,
    `| 交货期 | 确认订单后 ${quote.leadTime} 天 |`,
    `| 付款方式 | 30% 预付款，发货前付清尾款 |`,
    '',
    quote.discountPct > 0 ? `> 本单已享受大客户数量折扣 ${quote.discountPct}%。` : '',
    quote.belowMoq ? `> 提示：起订量为 ${quote.moq.toLocaleString()} 米，当前数量低于起订量，成交价可能上浮 5%-8%。` : '',
    '',
    '以上报价有效期为 15 天。如需样品或进一步洽谈，请随时与我们联系。',
    '',
    '顺颂商祺！',
    '纺织外贸销售部'
  ]
  return lines.filter(line => line !== '').join('\n')
}

function buildEnEmail(quote, customer) {
  const { fabric } = quote
  const lines = [
    `**Subject: Quotation for ${fabric.nameEn} (${quote.tradeTerm})**`,
    '',
    `Dear ${customer || 'Customer'},`,
    '',
    'Thank you for your inquiry. We are pleased to quote as follows:',
    '',
    `| Item | Details |`,
    `| --- | --- |`,
    `| Product | ${fabric.nameEn} (${fabric.name}) |`,
    `| Specification | ${fabric.spec} |`,
    `| Weight / Width | ${fabric.weight} / ${fabric.width} |`,
    `| Quantity | ${quote.quantity.toLocaleString()} meters |`,
    `| Unit Price | ${formatMoney(quote.unitPrice, quote.symbol)}/m (${quote.tradeTerm}) |`,
    `| Total Amount | ${formatMoney(quote.totalAmount, quote.symbol)} |`,
    `| Lead Time | ${quote.leadTime} days after order confirmation |`,
    `| Payment Terms | 30% deposit, balance before shipment |`,
    '',
    quote.discountPct > 0 ? `> A volume discount of ${quote.discountPct}% has been applied.` : '',
    quote.belowMoq ? `> Note: MOQ is ${quote.moq.toLocaleString()} meters. Orders below MOQ may be subject to a 5%-8% surcharge.` : '',
    '',
    'This quotation is valid for 15 days. Samples are available upon request.',
    '',
    'Best regards,',
    'Textile Export Sales Department'
  ]
  return lines.filter(line => line !== '').join('\n')
}

/**
 * 生成报价邮件（Markdown）
 * @param {Object} quote computeQuote 的返回值
 * @param {string} lang zh / en / both
 * @param {string} customer 客户称呼
 * @returns {string} 邮件 Markdown 文本
 */
export function buildQuoteEmail(quote, lang, customer) {
  const name = escapeHtml(customer).trim()
  if (lang === 'en') return buildEnEmail(quote, name)
  if (lang === 'both') return `${buildZhEmail(quote, name)}\n\n---\n\n${buildEnEmail(quote, name)}`
  return buildZhEmail(quote, name)
}

/* ---------------- 导出 ---------------- */

/**
 * 导出报价邮件为 Markdown 文件
 * @returns {string} 文件名
 */
export function exportQuoteMarkdown(quote, emailMarkdown) {
  const base = `${sanitizeFilename(`报价单_${quote.fabric.nameEn}`)}_${formatDateTime(Date.now()).replace(/[-: ]/g, '')}`
  const filename = `${base}.md`
  const header = `> 来源：纺织智能体 · 智能报价　|　生成时间：${formatDateTime(Date.now())}　|　ERP 编号：${quote.fabric.code}\n\n---\n\n`
  downloadFile(filename, header + emailMarkdown, 'text/markdown')
  return filename
}

/**
 * 导出报价邮件为 PDF（打开打印窗口，由浏览器"另存为 PDF"完成）
 */
export function printQuotePdf(quote, emailHtml) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>报价单 - ${quote.fabric.nameEn}</title>
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; max-width: 760px; margin: 0 auto; padding: 36px; color: #212b3f; line-height: 1.8; }
  h1 { color: #2f5496; font-size: 20px; border-bottom: 2px solid #e8eef8; padding-bottom: 10px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #dde2ea; padding: 7px 11px; font-size: 13px; text-align: left; }
  th { background: #f4f8fc; color: #2f5496; }
  blockquote { margin: 10px 0; padding: 6px 14px; border-left: 3px solid #2f5496; background: #f4f8fc; color: #5d6b84; font-size: 13px; }
  hr { border: none; border-top: 1px dashed #c9d4e4; margin: 22px 0; }
  .pdf-meta { font-size: 12px; color: #8a94a6; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
<h1>纺织智能体 · 报价单 Quotation</h1>
<p class="pdf-meta">ERP 编号：${quote.fabric.code}　|　生成时间：${formatDateTime(Date.now())}</p>
${emailHtml}
<script>window.onload = function () { window.print() }<\/script>
</body>
</html>`)
  win.document.close()
  return true
}
