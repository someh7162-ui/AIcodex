import { API_BASE_URL, hasApiBaseUrl } from '../config/api'

function request(url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      timeout: 70000,
      header: {
        'Content-Type': 'application/json',
      },
      data,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = res.data?.message || 'AI 行程规划请求失败'
          const error = new Error(message)
          error.statusCode = res.statusCode
          reject(error)
          return
        }

        resolve(res.data || {})
      },
      fail: () => {
        reject(new Error('无法连接 AI 行程规划服务，请检查后端服务是否已启动。'))
      },
    })
  })
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

function inferClientPreferences(messages = [], context = '') {
  const text = [
    context,
    ...messages.map((item) => item?.content || ''),
  ].join(' ')

  const daysMatch = text.match(/(\d{1,2})\s*(天|日)/)
  const days = daysMatch ? Math.min(7, Math.max(3, Number(daysMatch[1]) || 5)) : undefined
  const regions = ['北疆', '南疆', '伊犁', '乌鲁木齐', '喀什', '阿勒泰']
    .filter((item) => text.includes(item))

  const styles = []
  if (/亲子|家庭|孩子|老人/.test(text)) styles.push('亲子家庭')
  if (/摄影|拍照|出片/.test(text)) styles.push('摄影')
  if (/人文|历史|古城|博物馆|夜市/.test(text)) styles.push('人文')
  if (/草原|湖|雪山|自然|风光/.test(text)) styles.push('自然风光')
  if (/沙漠|峡谷|徒步|穿越|户外|装备/.test(text)) styles.push('户外探索')

  return {
    days,
    startCity: text.includes('喀什') ? '喀什' : '乌鲁木齐',
    regions,
    travelStyle: styles.join('、') || '',
    budget: /穷游|省钱|低预算/.test(text) ? '经济' : '',
    pace: /轻松|慢|不赶/.test(text) ? '轻松' : '',
  }
}

function formatErrorMessage(error) {
  const message = error?.message || 'AI 行程规划失败'

  if (error?.statusCode === 503 || message.includes('AI_API_KEY')) {
    return '后端 AI Key 未配置，请在服务器 .env 中填写 AI_API_KEY 后重启服务。'
  }

  if (error?.statusCode === 401) {
    return 'AI 服务鉴权失败，请检查后端 AI_API_KEY 是否有效。'
  }

  if (error?.statusCode === 429) {
    return 'AI 请求过于频繁或额度受限，请稍后再试。'
  }

  return message
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
  const result = await chatWithTravelAssistant([
    { role: 'user', content: '你好，请只回复“连接成功”。' },
  ])

  return {
    text: result.answer || '连接成功',
    elapsedMs: 0,
    model: 'backend-rag',
    id: '',
  }
}

export async function chatWithTravelAssistant(messages, context = '') {
  if (!hasApiBaseUrl()) {
    throw new Error('AI 后端服务地址未配置。')
  }

  const normalizedMessages = normalizeMessages(messages)

  try {
    const data = await request(`${API_BASE_URL}/ai/travel-plan`, {
      messages: normalizedMessages,
      preferences: inferClientPreferences(normalizedMessages, context),
      context,
    })

    return {
      answer: data.answer || '灵鹿暂时没有生成有效回答，请换个问法再试。',
      plan: data.plan || null,
      sources: Array.isArray(data.sources) ? data.sources : [],
    }
  } catch (error) {
    throw new Error(formatErrorMessage(error))
  }
}
