import { destinationList } from '../common/destination-data'
import { getGuideList } from '../common/guide-data'
import { AI_BASE_URL, AI_MODEL, getAiApiKey } from '../config/ai'

const SYSTEM_PROMPT = `你是“遇见新疆”App 内的 AI 旅游助手。你的主要职责是回答新疆旅行相关问题，并优先基于应用内已有景点、攻略和基础信息给出建议。

回答要求：
1. 优先围绕新疆旅游、目的地推荐、出行季节、玩法、预算、装备、安全与美食给建议。
2. 回答尽量简洁、实用、可执行，优先给清单或短段落。
3. 如果用户问题明显超出旅游场景，可以正常回答，但不要偏离“实用助手”风格。
4. 不要编造“已预订”“已联网查询到”之类不存在的事实；没有实时数据时明确说明是基于应用内资料给建议。
5. 如果用户问行程建议，优先给 2 到 5 天的简洁安排。`

const quickTips = [
  { title: '最佳季节', description: '5 月到 10 月更适合出行，天气舒适、景色层次也更丰富。' },
  { title: '语言沟通', description: '准备一些常用普通话表达，部分地区也能接触到维吾尔语。' },
  { title: '预算规划', description: '常规出行建议按每日 300 到 700 元预估住宿、餐饮与交通。' },
]

const essentialInfo = [
  { label: '货币', value: '人民币（CNY）' },
  { label: '时区', value: 'UTC+8，北京时间' },
  { label: '语言', value: '普通话、维吾尔语、哈萨克语等' },
  { label: '气候', value: '大陆性气候明显，夏季较热、昼夜温差较大' },
]

const MAX_DESTINATION_CONTEXT_ITEMS = 24
const MAX_GUIDE_CONTEXT_ITEMS = 8

function request(url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      timeout: 60000,
      header: {
        Authorization: `Bearer ${getAiApiKey()}`,
        'Content-Type': 'application/json',
      },
      data,
      success: (res) => {
        if (res.statusCode !== 200) {
          const message = res.data?.error?.message || res.data?.message || '请求失败'
          const prefix = `HTTP ${res.statusCode}`
          const fullMessage = message.startsWith(prefix) ? message : `${prefix}: ${message}`
          reject(new Error(fullMessage))
          return
        }

        resolve(res.data)
      },
      fail: reject,
    })
  })
}

function buildDestinationSummary() {
  const featuredItems = destinationList
    .slice(0, MAX_DESTINATION_CONTEXT_ITEMS)
    .map((item) => {
      const tips = item.tips.slice(0, 2).join('；')
      return `${item.name}（${item.location}，${item.category}）：${item.description}。建议：${item.suggestion}。提示：${tips}。`
    })
    .join('\n')

  const remainingNames = destinationList
    .slice(MAX_DESTINATION_CONTEXT_ITEMS)
    .map((item) => item.name)
    .join('、')

  return remainingNames ? `${featuredItems}\n其他可参考景区：${remainingNames}` : featuredItems
}

function buildGuideSummary() {
  const guideText = getGuideList()
    .slice(0, MAX_GUIDE_CONTEXT_ITEMS)
    .map((item) => `${item.title}（${item.category}）：${item.excerpt}`)
    .join('\n')

  const tipText = quickTips
    .map((item) => `${item.title}：${item.description}`)
    .join('\n')

  const infoText = essentialInfo
    .map((item) => `${item.label}：${item.value}`)
    .join('\n')

  return `${guideText}\n${tipText}\n${infoText}`
}

function buildTravelContext(extraContext = '') {
  const sections = [
    '应用内目的地资料：',
    buildDestinationSummary(),
    '应用内攻略与基础信息：',
    buildGuideSummary(),
  ]

  if (extraContext) {
    sections.push(`补充上下文：${extraContext}`)
  }

  return sections.join('\n\n')
}

function normalizeMessages(messages = []) {
  return messages
    .filter((item) => item?.role && item?.content)
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))
}

function getAssistantText(content) {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text || '')
      .join('\n')
      .trim()
  }

  return ''
}

function formatErrorMessage(error) {
  const message = error?.message || 'AI 服务调用失败'

  if (message.includes('401')) {
    return 'API Key 无效或已失效，请更新本地保存的百炼 Key。'
  }

  if (message.includes('429')) {
    return '请求过于频繁或额度受限，请稍后再试。'
  }

  return message
}

function isAssistantTruncated(data) {
  return data?.choices?.[0]?.finish_reason === 'length'
}

export function getTravelAssistantPresetQuestions() {
  return [
    '第一次去新疆怎么玩比较合适？',
    '喀纳斯适合安排几天？',
    '乌鲁木齐夜游推荐什么？',
    '沙漠穿越要准备哪些装备？',
  ]
}

export async function testTravelAssistantConnection() {
  const apiKey = getAiApiKey()

  if (!apiKey) {
    throw new Error('请先在本页保存百炼 API Key，再开始测试。')
  }

  const start = Date.now()
  const payload = {
    model: AI_MODEL,
    messages: [
      {
        role: 'user',
        content: '你好，请只回复“连接成功”。',
      },
    ],
    enable_thinking: false,
    temperature: 0.1,
    max_tokens: 32,
  }

  try {
    const data = await request(`${AI_BASE_URL}/chat/completions`, payload)
    const text = getAssistantText(data?.choices?.[0]?.message?.content)

    if (!text) {
      throw new Error('模型没有返回有效内容。')
    }

    return {
      text,
      elapsedMs: Date.now() - start,
      model: data?.model || AI_MODEL,
      id: data?.id || '',
    }
  } catch (error) {
    throw new Error(formatErrorMessage(error))
  }
}

export async function chatWithTravelAssistant(messages, context = '') {
  const apiKey = getAiApiKey()

  if (!apiKey) {
    throw new Error('请先在本页保存百炼 API Key，再开始提问。')
  }

  const payload = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: buildTravelContext(context) },
      ...normalizeMessages(messages),
    ],
    enable_thinking: false,
    temperature: 0.6,
    max_tokens: 1800,
  }

  try {
    const data = await request(`${AI_BASE_URL}/chat/completions`, payload)
    let text = getAssistantText(data?.choices?.[0]?.message?.content)

    if (!text) {
      throw new Error('模型没有返回有效内容。')
    }

    if (isAssistantTruncated(data)) {
      text = `${text}\n\n> 内容较长，可继续追问“继续”获取后续建议。`
    }

    return text
  } catch (error) {
    throw new Error(formatErrorMessage(error))
  }
}
