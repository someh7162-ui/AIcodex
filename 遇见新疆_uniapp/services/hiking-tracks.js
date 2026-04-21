import { requestJson } from '../common/app-http'
import { getStoredAuthToken } from '../common/auth-storage'
import { API_BASE_URL, hasApiBaseUrl } from '../config/api'

const HIKING_TRACK_API_BASE = API_BASE_URL

export function hasHikingTrackApi() {
  return hasApiBaseUrl() && Boolean(HIKING_TRACK_API_BASE)
}

function buildUrl(path) {
  return `${HIKING_TRACK_API_BASE}${path}`
}

function request(method, path, data, token = getStoredAuthToken()) {
  return new Promise((resolve, reject) => {
    if (!hasHikingTrackApi()) {
      reject(new Error('徒步轨迹服务地址未配置。'))
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    requestJson({
      url: buildUrl(path),
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
      reject(new Error(error?.message || '无法连接徒步轨迹服务，请检查服务器地址或网络。'))
    })
  })
}

export async function getMyHikingTracks(token = getStoredAuthToken()) {
  const data = await request('GET', '/users/me/hiking-tracks', undefined, token)
  return Array.isArray(data?.list) ? data.list : []
}

export async function createMyHikingTrack(payload, token = getStoredAuthToken()) {
  const data = await request('POST', '/users/me/hiking-tracks', payload, token)
  return data?.data || null
}

export async function updateMyHikingTrack(trackId, payload, token = getStoredAuthToken()) {
  const data = await request('PATCH', `/users/me/hiking-tracks/${encodeURIComponent(trackId)}`, payload, token)
  return data?.data || null
}

export async function deleteMyHikingTrack(trackId, token = getStoredAuthToken()) {
  const data = await request('DELETE', `/users/me/hiking-tracks/${encodeURIComponent(trackId)}`, undefined, token)
  return Boolean(data?.ok)
}
