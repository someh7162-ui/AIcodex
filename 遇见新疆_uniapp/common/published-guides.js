const PUBLISHED_GUIDES_STORAGE = 'meet-xinjiang-published-guides'

const defaultCoverOptions = [
  'https://upload.wikimedia.org/wikipedia/commons/d/d1/Nalati_Grassland_2.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/f/fc/East_gate_of_the_Ancient_City_of_Kashi_%2820230923104429%29.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/1/1d/%E4%B8%AD%E5%9B%BD%E6%96%B0%E7%96%86%E9%84%AF%E5%96%84%E5%8E%BF%E5%BA%93%E6%9C%A8%E5%A1%94%E6%A0%BC%E6%B2%99%E6%BC%A0_China_Xinjiang%2C_Piqan_County_Desert_Chi_-_panoramio.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/8/87/%E5%A4%A9%E5%B1%B1%E5%A4%A9%E6%B1%A02_-_panoramio.jpg',
]

const defaultAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=160'

function deriveContentType(item = {}, images = []) {
  if (item.contentType) {
    return item.contentType
  }

  if (item.video) {
    return '视频'
  }

  if (images.length) {
    return '图文'
  }

  return '文字'
}

function normalizeGuide(item = {}, index = 0) {
  if (!item.id || !item.title) {
    return null
  }

  const images = Array.isArray(item.images) && item.images.length
    ? item.images.filter(Boolean)
    : (item.image ? [item.image] : [])
  const contentType = deriveContentType(item, images)
  const previewImage = images[0] || item.videoPoster || item.image || ''
  const summaryText = item.excerpt || item.summary || ''

  return {
    id: item.id,
    title: item.title,
    category: item.category || '旅行分享',
    readTime: item.readTime || '3 分钟阅读',
    author: item.author || item.nickname || '新疆旅行者',
    publishDate: item.publishDate || new Date().toISOString().slice(0, 10),
    views: item.views || '0',
    likes: item.likes || '0',
    location: item.location || item.locationTag || '新疆同城',
    image: previewImage,
    images,
    excerpt: summaryText,
    highlights: Array.isArray(item.highlights) ? item.highlights.slice(0, 3) : [],
    sections: Array.isArray(item.sections) ? item.sections : [],
    tips: Array.isArray(item.tips) ? item.tips : [],
    nickname: item.nickname || '新疆旅行者',
    authorAvatar: item.authorAvatar || defaultAvatar,
    primaryTab: item.primaryTab || '发现',
    cityTab: item.cityTab || '同城',
    subCategory: item.subCategory || '推荐',
    contentType,
    likesCount: Number(item.likesCount) || 0,
    saveCount: Number(item.saveCount) || 0,
    commentCount: Number(item.commentCount) || 0,
    coverAspectRatio: Number(item.coverAspectRatio) || (previewImage ? 1.42 : 0.9),
    badgeCount: Number(item.badgeCount) || 0,
    locationTag: item.locationTag || item.location || '新疆同城',
    imageCount: images.length,
    video: item.video || '',
    videoPoster: item.videoPoster || '',
    summaryText,
    hasMedia: Boolean(previewImage || item.video),
    isUserPublished: true,
  }
}

function saveFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    uni.saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath || tempFilePath),
      fail: reject,
    })
  })
}

export async function persistLocalFile(filePath = '') {
  if (!filePath) {
    return ''
  }

  if (/^(https?:|wxfile:|file:|_doc|_downloads|\/|[A-Za-z]:\\)/.test(filePath)) {
    return filePath
  }

  try {
    return await saveFile(filePath)
  } catch (error) {
    return filePath
  }
}

export async function persistGuideImages(filePaths = []) {
  const list = Array.isArray(filePaths) ? filePaths.filter(Boolean).slice(0, 9) : []
  const savedPaths = []

  for (const filePath of list) {
    savedPaths.push(await persistLocalFile(filePath))
  }

  return savedPaths
}

export function getPublishedGuides() {
  try {
    const raw = uni.getStorageSync(PUBLISHED_GUIDES_STORAGE)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item, index) => normalizeGuide(item, index))
      .filter(Boolean)
      .sort((a, b) => String(b.publishDate).localeCompare(String(a.publishDate)) || String(b.id).localeCompare(String(a.id)))
  } catch (error) {
    return []
  }
}

export function getPublishedGuideById(id) {
  return getPublishedGuides().find((item) => item.id === id) || null
}

export function savePublishedGuides(list) {
  uni.setStorageSync(PUBLISHED_GUIDES_STORAGE, JSON.stringify(Array.isArray(list) ? list : []))
}

export function addPublishedGuide(payload, user = {}) {
  const current = getPublishedGuides()
  const guide = normalizeGuide(
    {
      ...payload,
      id: payload.id || `published-${Date.now()}`,
      author: user.nickname || payload.author,
      nickname: user.nickname || payload.nickname || '新疆旅行者',
      authorAvatar: user.avatar_url || payload.authorAvatar || defaultAvatar,
      publishDate: new Date().toISOString().slice(0, 10),
      images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [],
      primaryTab: '发现',
      cityTab: '同城',
      badgeCount: 1,
      likesCount: 0,
      saveCount: 0,
      commentCount: 0,
      isUserPublished: true,
    },
    current.length
  )

  if (!guide) {
    return null
  }

  const next = [guide, ...current]
  savePublishedGuides(next)
  return guide
}

export { defaultCoverOptions, PUBLISHED_GUIDES_STORAGE }
