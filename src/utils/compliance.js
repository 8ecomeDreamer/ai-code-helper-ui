/**
 * 合规校验模块工具（纯前端规则引擎）
 *
 * 对用户上传 / 粘贴的外贸合同条款文本执行规则匹配，输出合规校验报告。
 * 规则基于纺织品外贸常见风险点（成分标注、贸易术语、检验标准、支付、交期、
 * 不可抗力、争议解决、知识产权、包装唛头等）内置关键词与风险提示，
 * 前端即可独立完成；后续可由后端大模型深度审查增强（待对接）。
 */

// 校验规则集：level = error（缺失高风险）/ warn（建议完善）/ info（提示确认）
export const COMPLIANCE_RULES = [
  {
    id: 'composition',
    name: '成分标注条款',
    level: 'error',
    keywords: ['成分', '纤维含量', 'composition', '面料材质', '材质'],
    missing: '条款中未发现纤维成分/含量约定。纺织品成分标注是海关查验与买家索赔的高频争议点，必须明确成分比例及允许偏差（如 ±3%）。',
    present: '已包含成分标注约定。建议核对是否写明成分允许偏差与检测方法（如 FZ/T 01057 / ISO 1833）。'
  },
  {
    id: 'incoterms',
    name: '贸易术语（Incoterms）',
    level: 'error',
    keywords: ['fob', 'cif', 'exw', 'ddp', 'cfr', '贸易术语', 'incoterms'],
    missing: '未检测到贸易术语（FOB/CIF/EXW 等）。缺少术语将导致运费、保险与风险转移界限不清，极易引发纠纷。',
    present: '已明确贸易术语。建议同时注明术语版本（Incoterms 2020）与具体港口/地点。'
  },
  {
    id: 'inspection',
    name: '检验标准条款',
    level: 'error',
    keywords: ['检验', '检测', '验布', 'inspection', 'gb', 'aatcc', 'iso', 'oeko', 'sgs', '质量标准'],
    missing: '未约定检验标准与验货方式。建议明确执行标准（GB/FZT/AATCC/ISO）、抽检比例（如四分制 10% 抽检）与第三方验货机构。',
    present: '已包含检验标准约定。建议确认抽检比例、允收水准（AQL）与复验流程是否完整。'
  },
  {
    id: 'payment',
    name: '支付条款',
    level: 'error',
    keywords: ['付款', '支付', 'payment', 't/t', 'l/c', '信用证', '定金', '预付款', '尾款', '电汇'],
    missing: '未检测到支付条款。缺少付款方式（T/T、L/C 等）与付款节点将直接影响收汇安全。',
    present: '已包含支付条款。建议核对预付款比例（常见 30%）、尾款节点（发货前/见提单副本）及逾期付款利息约定。'
  },
  {
    id: 'delivery',
    name: '交期与延迟责任',
    level: 'warn',
    keywords: ['交货', '交期', 'delivery', '装运', 'shipment', '延迟', '延误'],
    missing: '未明确交货期或延迟交付责任。建议约定交货天数基准（如收到预付款后 X 天）与延迟违约金上限。',
    present: '已包含交期约定。建议确认延迟违约金比例（常见每周 0.5%，上限 5%）与宽限期条款。'
  },
  {
    id: 'force-majeure',
    name: '不可抗力条款',
    level: 'warn',
    keywords: ['不可抗力', 'force majeure', '天灾', '战争', '疫情'],
    missing: '缺少不可抗力条款。发生突发事件时双方责任界限不清，建议补充定义、通知义务与解除条件。',
    present: '已包含不可抗力条款。建议确认通知时限（如 7 日内书面通知）与证明机构（贸促会 CCPIT）。'
  },
  {
    id: 'dispute',
    name: '争议解决条款',
    level: 'warn',
    keywords: ['仲裁', '争议', '管辖', 'arbitration', 'dispute', '诉讼', 'cietaac'],
    missing: '未约定争议解决方式。建议明确仲裁机构（如 CIETAC 中国国际经济贸易仲裁委员会）或管辖法院及适用法律。',
    present: '已包含争议解决约定。建议确认适用法律（中国法/第三方法律）与仲裁地是否对己方有利。'
  },
  {
    id: 'ip-confidential',
    name: '知识产权与保密',
    level: 'info',
    keywords: ['知识产权', '保密', '花样', '花型', '专利', 'confidential', 'ip ', '版权'],
    missing: '未发现知识产权/保密条款。涉及定制花型、印花图案时建议约定花样版权归属与保密义务。',
    present: '已包含知识产权或保密约定，风险较低。'
  },
  {
    id: 'packing',
    name: '包装与唛头',
    level: 'info',
    keywords: ['包装', '唛头', 'packing', 'shipping mark', '卷装', '匹装'],
    missing: '未约定包装方式与唛头。纺织品海运受潮、串色风险较高，建议明确卷装/匹装、防潮材料与唛头内容。',
    present: '已包含包装/唛头约定。建议核对是否注明防潮、防晒等防护要求。'
  },
  {
    id: 'quantity-tolerance',
    name: '数量溢短装',
    level: 'info',
    keywords: ['溢短装', '更多或更少', 'more or less', 'tolerance', '数量偏差', '±'],
    missing: '未约定数量溢短装条款。面料生产存在自然缸差与米数偏差，建议约定 ±3%-5% 溢短装及按实结算方式。',
    present: '已包含数量偏差/溢短装约定，风险较低。'
  }
]

// 风险条款黑名单：命中即提示高风险
export const RISKY_PATTERNS = [
  {
    id: 'unlimited-liability',
    name: '无限连带责任',
    pattern: /(承担)?(一切|全部|无限)(责任|损失|赔偿)/g,
    advice: '条款中出现"承担一切/无限责任"类表述，责任范围无上限，建议修改为以合同金额为限的赔偿责任。'
  },
  {
    id: 'oaid-blank',
    name: '空白授权',
    pattern: /(买方|甲方)(有权|可以)(自行|单方面)(决定|变更|修改|取消)/g,
    advice: '存在对方单方面变更/取消合同的授权表述，建议补充"经双方书面协商一致"前置条件。'
  },
  {
    id: 'penalty-high',
    name: '高额违约金',
    pattern: /违约金[^。；\n]*?(\d{2,})\s*%/g,
    advice: '检测到较高违约金比例（≥10%），建议核对是否超出行业惯例（延迟交付常见每周 0.5%、上限 5%）。'
  },
  {
    id: 'payment-full-advance',
    name: '全款预付风险',
    pattern: /(发货前|交货前)[^。；\n]*?(100\s*%|全部|全额)(付款|支付)/g,
    advice: '作为卖方需确认"发货前付清全款"的可执行性；作为买方则该条款资金风险较高，建议改为 30% 预付 + 尾款见提单副本。'
  }
]

/**
 * 对条款文本执行合规校验
 * @param {string} text 条款文本
 * @returns {Object} { items, risks, summary } 校验报告
 */
export function checkCompliance(text) {
  const content = String(text || '')
  const lower = content.toLowerCase()

  // 必备条款检查
  const items = COMPLIANCE_RULES.map(rule => {
    const hit = rule.keywords.some(key => lower.includes(key.toLowerCase()))
    return {
      id: rule.id,
      name: rule.name,
      level: rule.level,
      passed: hit,
      detail: hit ? rule.present : rule.missing
    }
  })

  // 风险表述检查
  const risks = []
  for (const risk of RISKY_PATTERNS) {
    const matches = content.match(risk.pattern)
    if (matches && matches.length) {
      risks.push({ id: risk.id, name: risk.name, advice: risk.advice, hits: matches.slice(0, 3) })
    }
  }

  const missingError = items.filter(item => !item.passed && item.level === 'error').length
  const missingWarn = items.filter(item => !item.passed && item.level === 'warn').length
  const missingInfo = items.filter(item => !item.passed && item.level === 'info').length

  let verdict = 'pass'
  let verdictText = '条款整体完备，未发现高风险缺失项，可进入签署流程。'
  if (risks.length || missingError > 0) {
    verdict = 'reject'
    verdictText = `发现 ${missingError} 项高风险条款缺失、${risks.length} 处风险表述，不建议直接签署，请逐项修订后复检。`
  } else if (missingWarn > 0) {
    verdict = 'review'
    verdictText = `核心条款完备，但存在 ${missingWarn} 项建议完善内容，请法务确认后再签署。`
  }

  return {
    items,
    risks,
    summary: {
      total: items.length,
      passed: items.filter(item => item.passed).length,
      missingError,
      missingWarn,
      missingInfo,
      riskCount: risks.length,
      verdict,
      verdictText
    }
  }
}

// 演示条款样例（含典型缺失项，便于体验校验能力）
export const SAMPLE_CLAUSES = {
  good: `销售合同主要条款（示范文本）
1. 品名与成分：全棉平纹府绸，纤维含量 C 100%，成分偏差 ±3%，检测按 FZ/T 01057 执行。
2. 数量：50,000 米，允许 ±3% 溢短装，按实际米数结算（more or less clause）。
3. 价格与贸易术语：USD 1.45/米 FOB Shanghai，适用 Incoterms 2020。
4. 支付条款：T/T，30% 预付款，发货前付清尾款。
5. 检验标准：按 GB/T 406 四分制验布，AQL 2.5，买方可委托 SGS 在装运前验货。
6. 交货期：收到预付款后 25 天内装运；延迟交付每周按合同金额 0.5% 支付违约金，上限 5%。
7. 不可抗力：因天灾、战争、疫情等不可抗力无法履约时，受影响方应在 7 日内书面通知对方，并提供贸促会（CCPIT）证明。
8. 争议解决：协商不成提交 CIETAC 上海分会仲裁，适用中华人民共和国法律。
9. 知识产权：买方提供的花型图案版权归买方所有，卖方承担保密义务。
10. 包装：卷装，每卷 100 米，内衬防潮纸，外覆编织袋，唛头按买方要求印刷。`,
  risky: `采购协议条款（风险示范）
1. 卖方应于合同签订后 20 天内交付面料 30,000 米。
2. 价格：每米 9.5 元人民币。
3. 买方有权单方面决定变更订单数量与交货时间。
4. 如因卖方原因造成任何损失，卖方承担一切责任及全部赔偿责任，违约金为合同金额的 30%。
5. 付款方式：发货前买方支付 100% 全部货款。`
}
