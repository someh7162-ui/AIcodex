import { getGuideById, getGuideList } from '../common/guide-data'

const GUIDE_API_BASE = ''

function hasGuideApi() {
  return Boolean(GUIDE_API_BASE)
}

function request(url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      data,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail: reject,
    })
  })
}

export async function getGuideFeed(params = {}) {
  if (!hasGuideApi()) {
    return getGuideList()
  }

  const data = await request(`${GUIDE_API_BASE}/guides`, params)
  return Array.isArray(data?.list) ? data.list : []
}

export async function getGuideDetail(id) {
  if (!hasGuideApi()) {
    return getGuideById(id)
  }

  const data = await request(`${GUIDE_API_BASE}/guides/${encodeURIComponent(id)}`)
  return data?.data || null
}
