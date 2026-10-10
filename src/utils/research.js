/**
 * 竞品调研模块工具
 *
 * 真实能力需要后端爬取 / 对接外部电商与行情站点（阿里国际站、Made-in-China、
 * 全球纺织网等）聚合比价数据，前端无法独立完成，待后端提供
 * /api/research/fabric?keyword=xxx 接口后替换 searchCompetitors 实现。
 * 当前使用内置演示数据，保证页面交互与报告结构可完整预览。
 */

// 演示竞品数据：关键词 -> 各平台同类面料行情
const DEMO_MARKET = [
  {
    keywords: ['棉', 'cotton', '府绸', 'poplin', '纯棉'],
    fabric: '全棉平纹府绸（C 100% 40s×40s）',
    competitors: [
      { platform: '阿里巴巴国际站', supplier: 'Shaoxing Keqiao Textile Co., Ltd.', region: '浙江绍兴', price: 1.42, currency: 'USD', unit: '/米', moq: '2000 米', leadTime: '12-15 天', rating: 4.6, url: 'https://www.alibaba.com（演示链接）' },
      { platform: 'Made-in-China', supplier: 'Jiangsu Nantong Cotton Factory', region: '江苏南通', price: 1.35, currency: 'USD', unit: '/米', moq: '3000 米', leadTime: '15-18 天', rating: 4.3, url: 'https://www.made-in-china.com（演示链接）' },
      { platform: '全球纺织网', supplier: '绍兴柯桥布料批发行', region: '浙江绍兴', price: 9.2, currency: 'CNY', unit: '/米', moq: '500 米', leadTime: '7-10 天', rating: 4.1, url: 'https://www.tnc.com.cn（演示链接）' }
    ],
    analysis: [
      '国际市场全棉府绸均价区间 1.35-1.42 USD/米，绍兴柯桥报价整体偏低约 4%-6%；',
      '国内批发（全球纺织网）折合 USD 后与国际站价差 <3%，小单（500 米）优势明显；',
      '建议报价锚定 1.40-1.45 USD/米（FOB），交期承诺 15 天以内可形成竞争力。'
    ]
  },
  {
    keywords: ['涤棉', 't/c', 'tc', '纱卡', '斜纹', 'twill'],
    fabric: '涤棉斜纹纱卡（T65/C35 21s×21s）',
    competitors: [
      { platform: '阿里巴巴国际站', supplier: 'Hebei Shijiazhuang Guangda Fabric', region: '河北石家庄', price: 1.18, currency: 'USD', unit: '/米', moq: '3000 米', leadTime: '15-20 天', rating: 4.4, url: 'https://www.alibaba.com（演示链接）' },
      { platform: 'Made-in-China', supplier: 'Shandong Weifang Union Textile', region: '山东潍坊', price: 1.25, currency: 'USD', unit: '/米', moq: '2000 米', leadTime: '18 天', rating: 4.2, url: 'https://www.made-in-china.com（演示链接）' },
      { platform: '全球纺织网', supplier: '吴江盛泽面料直销中心', region: '江苏苏州', price: 8.4, currency: 'CNY', unit: '/米', moq: '1000 米', leadTime: '10-12 天', rating: 4.0, url: 'https://www.tnc.com.cn（演示链接）' }
    ],
    analysis: [
      '涤棉纱卡国际均价 1.18-1.25 USD/米，河北产区价格优势明显；',
      '江苏盛泽小单交期（10-12 天）快于北方产区约一周，适合急单客户；',
      '建议以 1.22 USD/米（FOB）为基准，突出稳定品控与验布报告增值项。'
    ]
  },
  {
    keywords: ['涤纶', '聚酯', 'polyester', '春亚纺', 'pongee', '涂层'],
    fabric: '涤纶春亚纺（P 100% 75D×150D）',
    competitors: [
      { platform: '阿里巴巴国际站', supplier: 'Wujiang Shengze Pongee Supplier', region: '江苏苏州', price: 0.52, currency: 'USD', unit: '/米', moq: '5000 米', leadTime: '10 天', rating: 4.5, url: 'https://www.alibaba.com（演示链接）' },
      { platform: 'Made-in-China', supplier: 'Zhejiang Haining Warp Knitting', region: '浙江海宁', price: 0.58, currency: 'USD', unit: '/米', moq: '3000 米', leadTime: '12-14 天', rating: 4.2, url: 'https://www.made-in-china.com（演示链接）' },
      { platform: '全球纺织网', supplier: '盛泽轻纺城门市部', region: '江苏苏州', price: 3.6, currency: 'CNY', unit: '/米', moq: '1000 米', leadTime: '5-7 天', rating: 3.9, url: 'https://www.tnc.com.cn（演示链接）' }
    ],
    analysis: [
      '春亚纺为高度同质化品类，价格竞争激烈，国际均价 0.52-0.58 USD/米；',
      '盛泽产区占据价格与交期双重优势，外采比价意义大于自产溢价；',
      '建议差异化切入：提供涂层/复合后整理一站式方案，抬升客单价。'
    ]
  },
  {
    keywords: ['牛仔', 'denim', '弹力', 'stretch'],
    fabric: '弹力色织牛仔布（C98/SP2 10s+70D）',
    competitors: [
      { platform: '阿里巴巴国际站', supplier: 'Guangdong Xintang Denim Mill', region: '广东广州', price: 2.85, currency: 'USD', unit: '/米', moq: '1000 米', leadTime: '20-25 天', rating: 4.7, url: 'https://www.alibaba.com（演示链接）' },
      { platform: 'Made-in-China', supplier: 'Jiangsu Changzhou Indigo Textile', region: '江苏常州', price: 2.6, currency: 'USD', unit: '/米', moq: '1500 米', leadTime: '25 天', rating: 4.3, url: 'https://www.made-in-china.com（演示链接）' },
      { platform: '全球纺织网', supplier: '新塘牛仔面料档口', region: '广东广州', price: 19.5, currency: 'CNY', unit: '/米', moq: '300 米', leadTime: '10-15 天', rating: 4.2, url: 'https://www.tnc.com.cn（演示链接）' }
    ],
    analysis: [
      '弹力牛仔布国际均价 2.6-2.85 USD/米，广东新塘为价格标杆产区；',
      '该品类环保认证（BCI 棉、 bluesign）是海外买家核心筛选条件；',
      '建议报价 2.7 USD/米（FOB）并附环保证书清单，交期承诺不超过 25 天。'
    ]
  }
]

/**
 * 按面料关键词检索竞品行情（演示数据；待后端对接真实爬取/聚合接口）
 * @param {string} keyword 用户输入的面料关键词
 * @returns {Promise<Object|null>} { fabric, competitors, analysis, demo } 或 null（无匹配）
 */
export async function searchCompetitors(keyword) {
  // TODO: 后端对接 - axios.get('/api/research/fabric', { params: { keyword } })
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw) return Promise.resolve(null)
  const hit = DEMO_MARKET.find(item => item.keywords.some(key => kw.includes(key.toLowerCase())))
  if (!hit) return Promise.resolve(null)
  return Promise.resolve({ ...hit, demo: true })
}

// 热门面料快捷入口
export const HOT_KEYWORDS = ['全棉府绸', '涤棉纱卡', '春亚纺', '弹力牛仔布']
