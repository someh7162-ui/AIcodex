const path = require('path')
const { pathToFileURL } = require('url')

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const DEFAULT_MODEL = 'qwen3.6-plus'
const MAX_MESSAGES = 8
const MAX_SOURCES = 10

const quickTravelFacts = [
  {
    title: '新疆通用旅行建议',
    text: '新疆地域辽阔，城市和景区之间车程较长。首次旅行建议从乌鲁木齐进入，按北疆自然风光、伊犁草原、南疆人文等主题拆分线路。',
  },
  {
    title: '季节与预算参考',
    text: '5 月到 10 月更适合常规旅行。常规预算可按每日 300 到 700 元预估住宿、餐饮与城市间交通，旺季住宿和包车价格可能上浮。',
  },
  {
    title: '安全与装备提示',
    text: '沙漠、峡谷、独库公路和高海拔区域要关注天气、补给、通信信号和昼夜温差。徒步或穿越不建议单独行动。',
  },
]

const routeKeywordGroups = [
  { keyword: '北疆', names: ['乌鲁木齐', '天山天池', '喀纳斯', '禾木', '赛里木湖', '五彩滩', '白哈巴'] },
  { keyword: '南疆', names: ['喀什古城', '帕米尔', '塔克拉玛干沙漠', '库车王府', '克孜尔石窟', '和田老城'] },
  { keyword: '伊犁', names: ['赛里木湖', '那拉提', '喀拉峻', '夏塔', '昭苏', '霍城薰衣草'] },
  { keyword: '乌鲁木齐', names: ['新疆博物馆', '红山公园', '国际大巴扎', '天山天池', '南山牧场'] },
  { keyword: '沙漠', names: ['塔克拉玛干沙漠', '库木塔格沙漠', '罗布人村寨'] },
  { keyword: '峡谷', names: ['温宿大峡谷', '安集海大峡谷', '天山神秘大峡谷', '独库公路北段观景线'] },
]

let destinationModulePromise = null

function normalizeText(value = '') {
  return String(value || '').trim()
}

function compactWhitespace(value = '') {
  return normalizeText(value).replace(/\s+/g, ' ')
}

function normalizeSearchText(value = '') {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, '')
}

function uniqueList(list = []) {
  return [...new Set(list.map((item) => normalizeText(item)).filter(Boolean))]
}

function parseDays(text = '', fallback = 5) {
  const normalized = normalizeText(text)
  const arabicMatch = normalized.match(/(\d{1,2})\s*(天|日|day|days)/i)
  if (arabicMatch) {
    return clampDays(Number(arabicMatch[1]), fallback)
  }

  const chineseMap = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
  }
  const chineseMatch = normalized.match(/([一二两三四五六七])\s*(天|日)/)
  return chineseMatch ? clampDays(chineseMap[chineseMatch[1]], fallback) : fallback
}

function clampDays(value, fallback) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    return fallback
  }
  return Math.min(7, Math.max(3, Math.round(numberValue)))
}

function inferPreferences(messages = [], preferences = {}, context = '') {
  const text = compactWhitespace([
    context,
    ...messages.map((item) => item?.content || ''),
    preferences.travelStyle,
    preferences.budget,
    preferences.pace,
    Array.isArray(preferences.regions) ? preferences.regions.join(' ') : preferences.regions,
  ].join(' '))

  const days = clampDays(preferences.days || parseDays(text, 5), 5)
  const regions = uniqueList([
    ...(Array.isArray(preferences.regions) ? preferences.regions : [preferences.regions]),
    ...routeKeywordGroups.filter((item) => text.includes(item.keyword)).map((item) => item.keyword),
  ])

  const styleHints = []
  if (/亲子|家庭|老人|孩子/.test(text)) styleHints.push('亲子家庭')
  if (/摄影|拍照|出片/.test(text)) styleHints.push('摄影')
  if (/人文|历史|古城|博物馆|夜市/.test(text)) styleHints.push('人文')
  if (/草原|湖|雪山|自然|风光/.test(text)) styleHints.push('自然风光')
  if (/沙漠|峡谷|徒步|穿越|户外|装备/.test(text)) styleHints.push('户外探索')

  return {
    days,
    startCity: normalizeText(preferences.startCity) || (text.includes('喀什') ? '喀什' : '乌鲁木齐'),
    regions: regions.length ? regions.slice(0, 3) : [],
    travelStyle: normalizeText(preferences.travelStyle) || uniqueList(styleHints).join('、') || '经典观光',
    budget: normalizeText(preferences.budget) || '中等',
    pace: normalizeText(preferences.pace) || (/轻松|慢|不赶/.test(text) ? '轻松' : '适中'),
  }
}

async function loadDestinationModule() {
  if (!destinationModulePromise) {
    const moduleUrl = pathToFileURL(path.join(__dirname, '../common/destination-data.js')).href
    destinationModulePromise = import(moduleUrl)
  }
  return destinationModulePromise
}

async function buildDestinationDocuments(db) {
  if (db) {
    const remoteDocuments = await buildDestinationDocumentsFromDb(db)
    if (remoteDocuments.length) {
      return remoteDocuments
    }
  }

  const {
    destinationList,
    getDestinationCulture,
    getDestinationTravelMeta,
    getDestinationVisitMeta,
  } = await loadDestinationModule()

  return destinationList.map((item) => {
    const culture = getDestinationCulture(item.id) || {}
    const travelMeta = getDestinationTravelMeta(item.id) || {}
    const visitMeta = getDestinationVisitMeta(item.id) || {}
    const tips = Array.isArray(item.tips) ? item.tips.join('；') : ''
    const text = [
      item.name,
      item.location,
      item.region,
      item.category,
      item.description,
      item.suggestion,
      tips,
      culture.overview,
      culture.history,
      culture.highlights,
      travelMeta.season,
      travelMeta.stay,
      travelMeta.audience,
      visitMeta.ticket,
      visitMeta.openHours,
    ].filter(Boolean).join('。')

    return {
      sourceType: 'destination',
      id: item.id,
      destinationId: item.id,
      title: item.name,
      region: item.region || '',
      category: item.category || '',
      text,
      snippet: makeSnippet(text),
      searchText: normalizeSearchText(text),
    }
  })
}

async function buildDestinationDocumentsFromDb(db) {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        location,
        region,
        category,
        description,
        tips,
        suggestion,
        culture_overview,
        culture_history,
        culture_highlights,
        recommended_season,
        recommended_stay,
        suitable_audience,
        ticket_reference,
        open_hours
      FROM destinations
      WHERE status = 'published'
      ORDER BY sort_order ASC, id ASC
      LIMIT 120
    `)

    return result.rows.map((row) => {
      const text = [
        row.name,
        row.location,
        row.region,
        row.category,
        row.description,
        row.suggestion,
        ...(Array.isArray(row.tips) ? row.tips : []),
        row.culture_overview,
        row.culture_history,
        row.culture_highlights,
        row.recommended_season,
        row.recommended_stay,
        row.suitable_audience,
        row.ticket_reference,
        row.open_hours,
      ].filter(Boolean).join('。')

      return {
        sourceType: 'destination',
        id: row.id,
        destinationId: row.id,
        title: row.name,
        region: row.region || row.location || '',
        category: row.category || '',
        text,
        snippet: makeSnippet(text),
        searchText: normalizeSearchText(text),
      }
    })
  } catch (error) {
    console.warn('[ai-rag] destination db retrieval skipped:', error.message)
    return []
  }
}

async function buildGuideDocuments(db) {
  try {
    const result = await db.query(`
      SELECT
        g.slug,
        g.destination_id,
        g.title,
        g.category,
        g.sub_category,
        g.location,
        g.location_tag,
        g.excerpt,
        g.summary_text,
        g.highlights,
        g.tips,
        COALESCE(section_text.sections_text, '') AS sections_text
      FROM guides g
      LEFT JOIN LATERAL (
        SELECT string_agg(
          CONCAT_WS('：', gs.title, array_to_string(gs.paragraphs, '。')),
          '。' ORDER BY gs.sort_order ASC, gs.id ASC
        ) AS sections_text
        FROM guide_sections gs
        WHERE gs.guide_id = g.id
      ) section_text ON TRUE
      WHERE g.status = 'published'
      ORDER BY COALESCE(g.likes_count, 0) DESC, COALESCE(g.save_count, 0) DESC, g.sort_order DESC, g.id DESC
      LIMIT 80
    `)

    return result.rows.map((row) => {
      const text = [
        row.title,
        row.category,
        row.sub_category,
        row.location,
        row.location_tag,
        row.excerpt,
        row.summary_text,
        ...(Array.isArray(row.highlights) ? row.highlights : []),
        ...(Array.isArray(row.tips) ? row.tips : []),
        row.sections_text,
      ].filter(Boolean).join('。')

      return {
        sourceType: 'guide',
        id: row.slug,
        guideSlug: row.slug,
        destinationId: row.destination_id ? Number(row.destination_id) : null,
        title: row.title,
        region: row.location || row.location_tag || '',
        category: row.category || row.sub_category || '',
        text,
        snippet: makeSnippet(text),
        searchText: normalizeSearchText(text),
      }
    })
  } catch (error) {
    console.warn('[ai-rag] guide retrieval skipped:', error.message)
    return []
  }
}

function buildFactDocuments() {
  return quickTravelFacts.map((item, index) => ({
    sourceType: 'guide',
    id: `builtin-${index + 1}`,
    guideSlug: '',
    destinationId: null,
    title: item.title,
    region: '新疆',
    category: '基础信息',
    text: item.text,
    snippet: makeSnippet(item.text),
    searchText: normalizeSearchText(`${item.title} ${item.text}`),
  }))
}

function makeSnippet(text = '', limit = 96) {
  const normalized = compactWhitespace(text)
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized
}

function buildQueryTokens(query = '', preferences = {}) {
  const raw = compactWhitespace([
    query,
    preferences.startCity,
    preferences.travelStyle,
    preferences.budget,
    preferences.pace,
    ...(Array.isArray(preferences.regions) ? preferences.regions : [preferences.regions]),
  ].join(' '))
  const tokens = new Set()

  raw
    .split(/[,\s，。！？、；;:：/|]+/)
    .map((item) => normalizeSearchText(item))
    .filter((item) => item.length >= 2)
    .forEach((item) => tokens.add(item))

  const normalizedRaw = normalizeSearchText(raw)
  routeKeywordGroups.forEach((group) => {
    if (normalizedRaw.includes(normalizeSearchText(group.keyword))) {
      tokens.add(normalizeSearchText(group.keyword))
      group.names.forEach((name) => tokens.add(normalizeSearchText(name)))
    }
  })

  return [...tokens]
}

function scoreDocument(doc, queryText, tokens, preferences) {
  let score = 0
  const normalizedQuery = normalizeSearchText(queryText)
  const title = normalizeSearchText(doc.title)
  const shortTitle = title.replace(/(景区|风景区|国家公园|森林公园|湿地公园|地质公园|公园)$/u, '')
  const region = normalizeSearchText(doc.region)
  const category = normalizeSearchText(doc.category)

  if (title && normalizedQuery.includes(title)) score += 90
  if (shortTitle && shortTitle.length >= 2 && normalizedQuery.includes(shortTitle)) score += 80
  if (region && normalizedQuery.includes(region)) score += 24
  if (category && normalizedQuery.includes(category)) score += 18
  if (doc.sourceType === 'destination') score += 8

  tokens.forEach((token) => {
    if (!token) return
    if (title.includes(token)) score += 30
    if (region.includes(token)) score += 14
    if (category.includes(token)) score += 12
    if (doc.searchText.includes(token)) score += 5
  })

  ;(preferences.regions || []).forEach((regionName) => {
    const token = normalizeSearchText(regionName)
    if (token && (region.includes(token) || doc.searchText.includes(token))) score += 18
  })

  routeKeywordGroups.forEach((group) => {
    const groupToken = normalizeSearchText(group.keyword)
    if (!normalizedQuery.includes(groupToken)) return
    if (group.names.some((name) => title.includes(normalizeSearchText(name)))) score += 28
  })

  if (/第一次|首次|入门|经典/.test(queryText) && /乌鲁木齐|天山天池|赛里木湖|喀纳斯|那拉提|喀什/.test(doc.title)) {
    score += 18
  }
  if (/沙漠|穿越|装备|补给|防晒/.test(queryText) && /沙漠|峡谷|户外|安全|装备|补给/.test(doc.text)) {
    score += 26
  }

  return score
}

async function searchTravelKnowledge({ db, messages = [], preferences = {}, context = '', limit = MAX_SOURCES }) {
  const userText = compactWhitespace([
    context,
    ...messages.map((item) => item?.content || ''),
  ].join(' '))
  const inferred = inferPreferences(messages, preferences, context)
  const tokens = buildQueryTokens(userText, inferred)
  const docs = [
    ...(await buildDestinationDocuments(db)),
    ...(await buildGuideDocuments(db)),
    ...buildFactDocuments(),
  ]

  const ranked = docs
    .map((doc) => ({
      ...doc,
      score: scoreDocument(doc, userText, tokens, inferred),
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)

  const selected = (ranked.length ? ranked : docs.filter((doc) => doc.sourceType === 'destination').slice(0, limit))
    .slice(0, limit)

  return {
    preferences: inferred,
    sources: selected.map(toPublicSource),
    contextText: selected.map((item, index) => formatContextBlock(item, index + 1)).join('\n\n'),
  }
}

function toPublicSource(doc) {
  return {
    sourceType: doc.sourceType,
    title: doc.title,
    id: doc.id,
    destinationId: doc.destinationId || undefined,
    guideSlug: doc.guideSlug || undefined,
    snippet: doc.snippet,
  }
}

function formatContextBlock(doc, index) {
  return `[${index}] ${doc.sourceType === 'destination' ? '目的地' : '攻略'}：${doc.title}
地区/分类：${[doc.region, doc.category].filter(Boolean).join(' / ') || '未标注'}
内容：${makeSnippet(doc.text, 420)}`
}

function normalizeMessages(messages = []) {
  return messages
    .filter((item) => item?.role && item?.content)
    .slice(-MAX_MESSAGES)
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: compactWhitespace(item.content).slice(0, 1200),
    }))
}

function buildSystemPrompt(preferences, contextText) {
  return `你是“丝路疆寻”App 的新疆旅行 RAG + 规划 Agent。

你必须遵守：
1. 只基于“应用内检索资料”和用户提供的上下文生成建议，不要声称联网查询、实时查票、实时查天气或已完成预订。
2. 当用户缺少出发月份、出发城市、预算等信息时，使用默认值继续给方案，并提示补充信息后可继续优化。
3. 优先输出 3 到 7 天的可执行行程：每日主题、景点停留、交通逻辑、装备/安全提醒和可替换景点。
4. 票价、开放时间、交通班次只能说成“参考”或“需出行前确认”。
5. 回答必须是中文，务实、简洁、适合在手机端阅读。

已解析偏好：
- 天数：${preferences.days} 天
- 出发城市：${preferences.startCity}
- 区域：${preferences.regions.length ? preferences.regions.join('、') : '未指定，默认经典路线'}
- 玩法：${preferences.travelStyle}
- 预算：${preferences.budget}
- 节奏：${preferences.pace}

应用内检索资料：
${contextText || '暂无命中的应用内资料，请使用新疆通用旅行常识谨慎回答。'}

请只返回 JSON，不要包裹 Markdown。JSON 结构：
{
  "answer": "给用户看的完整回答，使用 Markdown 小标题和列表",
  "plan": {
    "days": [
      {
        "day": 1,
        "theme": "当日主题",
        "stops": ["地点1", "地点2"],
        "transport": "交通逻辑",
        "tips": ["提醒1", "提醒2"]
      }
    ],
    "warnings": ["风险提醒"],
    "estimatedBudget": "预算参考"
  }
}`
}

async function callChatModel({ aiConfig, messages, preferences, contextText }) {
  const apiKey = normalizeText(aiConfig.apiKey)
  if (!apiKey) {
    const error = new Error('AI_API_KEY 未配置，请在后端 .env 中填写通义/百炼 API Key。')
    error.statusCode = 503
    throw error
  }

  const baseUrl = normalizeText(aiConfig.baseUrl) || DEFAULT_BASE_URL
  const model = normalizeText(aiConfig.model) || DEFAULT_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(preferences, contextText) },
          ...normalizeMessages(messages),
        ],
        enable_thinking: false,
        temperature: 0.45,
        max_tokens: 2200,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `AI 服务请求失败：HTTP ${response.status}`
      const error = new Error(message)
      error.statusCode = response.status === 401 ? 503 : response.status
      throw error
    }

    return parseModelResponse(data)
  } finally {
    clearTimeout(timeout)
  }
}

function parseModelResponse(data) {
  const content = data?.choices?.[0]?.message?.content
  const text = Array.isArray(content)
    ? content.map((item) => item?.text || '').join('\n')
    : normalizeText(content)

  if (!text) {
    throw new Error('AI 服务没有返回有效内容。')
  }

  const parsed = parseJsonText(text)
  if (!parsed || typeof parsed !== 'object') {
    return {
      answer: text,
      plan: { days: [], warnings: [], estimatedBudget: '' },
    }
  }

  return {
    answer: normalizeText(parsed.answer) || text,
    plan: normalizePlan(parsed.plan),
  }
}

function parseJsonText(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizePlan(plan = {}) {
  const days = Array.isArray(plan.days) ? plan.days : []
  return {
    days: days.slice(0, 7).map((item, index) => ({
      day: Number(item.day) || index + 1,
      theme: normalizeText(item.theme),
      stops: Array.isArray(item.stops) ? item.stops.map(normalizeText).filter(Boolean).slice(0, 8) : [],
      transport: normalizeText(item.transport),
      tips: Array.isArray(item.tips) ? item.tips.map(normalizeText).filter(Boolean).slice(0, 6) : [],
    })),
    warnings: Array.isArray(plan.warnings) ? plan.warnings.map(normalizeText).filter(Boolean).slice(0, 8) : [],
    estimatedBudget: normalizeText(plan.estimatedBudget),
  }
}

async function runTravelPlanningAgent({ db, aiConfig, messages = [], preferences = {}, context = '' }) {
  const normalizedMessages = normalizeMessages(messages)
  if (!normalizedMessages.length) {
    const error = new Error('请先输入旅行问题。')
    error.statusCode = 400
    throw error
  }

  const rag = await searchTravelKnowledge({
    db,
    messages: normalizedMessages,
    preferences,
    context,
  })
  const modelResult = await callChatModel({
    aiConfig,
    messages: normalizedMessages,
    preferences: rag.preferences,
    contextText: rag.contextText,
  })

  return {
    answer: modelResult.answer,
    plan: modelResult.plan,
    sources: rag.sources,
  }
}

module.exports = {
  runTravelPlanningAgent,
  searchTravelKnowledge,
  inferPreferences,
}
