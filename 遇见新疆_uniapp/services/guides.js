import { getGuideById, getGuideList } from '../common/guide-data'
import { requestJson } from '../common/app-http'
import { addPublishedGuide, getPublishedGuideById, getPublishedGuides, persistGuideImages, persistLocalFile } from '../common/published-guides'
import { getStoredAuthToken, getStoredAuthUser } from '../common/auth-storage'
import { API_BASE_URL, hasApiBaseUrl, normalizeApiAssetUrl } from '../config/api'

const GUIDE_API_BASE = API_BASE_URL

export function hasGuideApi() {
  return hasApiBaseUrl() && Boolean(GUIDE_API_BASE)
}

function buildUrl(path, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  return query ? `${GUIDE_API_BASE}${path}?${query}` : `${GUIDE_API_BASE}${path}`
}

function request(method, path, data, token = getStoredAuthToken()) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    requestJson({
      url: buildUrl(path, method === 'GET' ? data : undefined),
      method,
      timeout: 20000,
      headers,
      header: headers,
      data: method === 'GET' ? undefined : data,
    }).then((res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(res.data?.message || `HTTP ${res.statusCode}`)
          error.statusCode = res.statusCode
          reject(error)
          return
        }
        resolve(res.data || {})
      }).catch((error) => {
        reject(new Error(error?.message || '无法连接攻略服务，请检查服务器地址或网络。'))
      })
  })
}

function normalizeGuideEntity(item) {
  if (!item || typeof item !== 'object') {
    return item
  }

  return {
    ...item,
    image: normalizeApiAssetUrl(item.image),
    images: Array.isArray(item.images) ? item.images.map(normalizeApiAssetUrl).filter(Boolean) : [],
    authorAvatar: normalizeApiAssetUrl(item.authorAvatar),
    video: normalizeApiAssetUrl(item.video),
    videoPoster: normalizeApiAssetUrl(item.videoPoster),
  }
}

export function uploadGuideMedia(filePath, mediaType = 'image', token = getStoredAuthToken()) {
  return new Promise((resolve, reject) => {
    if (!hasGuideApi()) {
      reject(new Error('攻略服务地址未配置。'))
      return
    }

    if (!token) {
      reject(new Error('登录状态失效，请重新登录。'))
      return
    }

    uni.uploadFile({
      url: `${GUIDE_API_BASE}/guides/media`,
      filePath,
      name: 'file',
      formData: { mediaType },
      timeout: 60000,
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(data?.message || '媒体上传失败。'))
            return
          }
          resolve(data || {})
        } catch {
          reject(new Error('媒体上传响应解析失败。'))
        }
      },
      fail: () => {
        reject(new Error('媒体上传失败，请检查网络。'))
      },
    })
  })
}

export async function createGuide(payload, token = getStoredAuthToken()) {
  if (hasGuideApi()) {
    const data = await request('POST', '/guides', payload, token)
    return normalizeGuideEntity(data?.data || null)
  }

  const savedImages = await persistGuideImages(payload.images)
  const savedVideo = payload.video ? await persistLocalFile(payload.video) : ''
  const savedVideoPoster = payload.videoPoster ? await persistLocalFile(payload.videoPoster) : ''

  return addPublishedGuide(
    {
      ...payload,
      image: payload.image || savedImages[0] || savedVideoPoster || '',
      images: savedImages,
      video: savedVideo,
      videoPoster: savedVideoPoster,
    },
    getStoredAuthUser() || {}
  )
}

export async function getGuideFeed(params = {}) {
  const publishedGuides = getPublishedGuides()

  if (!hasGuideApi()) {
    return [...publishedGuides, ...getGuideList()]
  }

  const data = await request('GET', '/guides', params)
  return Array.isArray(data?.list) ? data.list.map(normalizeGuideEntity) : []
}

export async function getGuideDetail(id) {
  if (!hasGuideApi()) {
    return getPublishedGuideById(id) || getGuideById(id)
  }

  const data = await request('GET', `/guides/${encodeURIComponent(id)}`)
  return normalizeGuideEntity(data?.data || null)
}

export async function getGuideComments(slug) {
  if (!hasGuideApi()) return []
  const data = await request('GET', `/guides/${encodeURIComponent(slug)}/comments`)
  return Array.isArray(data?.list)
    ? data.list.map((item) => ({
      ...item,
      avatarUrl: normalizeApiAssetUrl(item.avatarUrl),
      authorAvatar: normalizeApiAssetUrl(item.authorAvatar),
    }))
    : []
}

export async function postGuideComment(slug, content, token) {
  const data = await request('POST', `/guides/${encodeURIComponent(slug)}/comments`, { content }, token)
  return data?.comment
    ? {
      ...data.comment,
      avatarUrl: normalizeApiAssetUrl(data.comment.avatarUrl),
      authorAvatar: normalizeApiAssetUrl(data.comment.authorAvatar),
    }
    : null
}

export async function deleteGuideComment(slug, commentId, token) {
  const data = await request('DELETE', `/guides/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}`, undefined, token)
  return Boolean(data?.ok)
}

export async function likeGuide(slug, token) {
  const data = await request('POST', `/guides/${encodeURIComponent(slug)}/like`, undefined, token)
  return data || null
}

export async function unlikeGuide(slug, token) {
  const data = await request('DELETE', `/guides/${encodeURIComponent(slug)}/like`, undefined, token)
  return data || null
}

export async function saveGuide(slug, token) {
  const data = await request('POST', `/guides/${encodeURIComponent(slug)}/save`, undefined, token)
  return data || null
}

export async function unsaveGuide(slug, token) {
  const data = await request('DELETE', `/guides/${encodeURIComponent(slug)}/save`, undefined, token)
  return data || null
}
