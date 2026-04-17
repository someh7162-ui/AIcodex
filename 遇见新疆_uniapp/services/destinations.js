import {
  destinationList,
  getDestinationById as getLocalDestinationById,
  getDestinationCulture as getLocalDestinationCulture,
  getDestinationTravelMeta as getLocalDestinationTravelMeta,
  getDestinationVisitMeta as getLocalDestinationVisitMeta,
  getDouyinSearchUrl,
} from '../common/destination-data'
import { API_BASE_URL, hasApiBaseUrl } from '../config/api'

function request(url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 15000,
      data,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data?.message || `HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail: reject,
    })
  })
}

function hasContentApi() {
  return hasApiBaseUrl()
}

export function getLocalDestinationList() {
  return destinationList
}

export function getDestinationCategories(list = destinationList) {
  return ['全部', ...new Set(list.map((item) => item.category).filter(Boolean))]
}

export function getDestinationRegions(list = destinationList) {
  const regionOrder = [
    '乌鲁木齐市',
    '克拉玛依市',
    '吐鲁番市',
    '昌吉州',
    '博州',
    '巴州',
    '阿克苏地区',
    '喀什地区',
    '和田地区',
    '伊犁州',
    '塔城地区',
    '阿勒泰地区',
  ]
  const knownRegions = regionOrder.filter((item) => list.some((spot) => spot.region === item))
  const extraRegions = [...new Set(list.map((item) => item.region).filter(Boolean))]
    .filter((item) => !regionOrder.includes(item))
  return ['全部', ...knownRegions, ...extraRegions]
}

export async function getDestinationFeed(params = {}) {
  if (!hasContentApi()) {
    return destinationList
  }

  try {
    const data = await request(`${API_BASE_URL}/destinations`, params)
    return Array.isArray(data?.list) ? data.list : destinationList
  } catch (error) {
    return destinationList
  }
}

export async function getDestinationDetail(id) {
  if (!hasContentApi()) {
    return getLocalDestinationById(id)
  }

  try {
    const data = await request(`${API_BASE_URL}/destinations/${encodeURIComponent(id)}`)
    return data?.data || getLocalDestinationById(id)
  } catch (error) {
    return getLocalDestinationById(id)
  }
}

export function getDestinationCulture(destination, id) {
  if (destination?.culture) {
    return destination.culture
  }
  return getLocalDestinationCulture(id || destination?.id)
}

export function getDestinationTravelMeta(destination, id) {
  if (destination?.travelMeta) {
    return destination.travelMeta
  }
  return getLocalDestinationTravelMeta(id || destination?.id)
}

export function getDestinationVisitMeta(destination, id) {
  if (destination?.visitMeta) {
    return destination.visitMeta
  }
  return getLocalDestinationVisitMeta(id || destination?.id)
}

export { getDouyinSearchUrl }
