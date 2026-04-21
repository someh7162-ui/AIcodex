import { AUTH_API_BASE_URL, hasAuthApiBaseUrl } from '../config/auth'
import { requestJson } from '../common/app-http'
import { normalizeApiAssetUrl } from '../config/api'

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return user
  }

  const avatarUrl = normalizeApiAssetUrl(user.avatar_url || user.avatar)

  return {
    ...user,
    avatar_url: avatarUrl,
    avatar: avatarUrl,
  }
}

function normalizeResponseData(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  return {
    ...data,
    user: normalizeUser(data.user),
    data: data.data && typeof data.data === 'object'
      ? {
          ...data.data,
          avatar_url: normalizeApiAssetUrl(data.data.avatar_url || data.data.avatar),
          avatar: normalizeApiAssetUrl(data.data.avatar || data.data.avatar_url),
        }
      : data.data,
  }
}

function request(path, data) {
  return new Promise((resolve, reject) => {
    if (!hasAuthApiBaseUrl()) {
      reject(new Error('认证服务地址未配置，请先在 config/auth.js 中填写 AUTH_API_BASE_URL。'))
      return
    }

    requestJson({
      url: `${AUTH_API_BASE_URL}${path}`,
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
      header: {
        'Content-Type': 'application/json',
      },
      data,
    }).then((res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data?.message || `请求失败(${res.statusCode})`))
          return
        }

        resolve(normalizeResponseData(res.data || {}))
      }).catch((error) => {
        reject(new Error(error?.message || '无法连接认证服务，请检查服务器地址或网络。'))
      })
  })
}

export async function loginWithPassword(payload) {
  return request('/auth/login', payload)
}

export async function registerWithPassword(payload) {
  return request('/auth/register', payload)
}

function authRequest(path, method, token, data) {
  return new Promise((resolve, reject) => {
    if (!hasAuthApiBaseUrl()) {
      reject(new Error('认证服务地址未配置'))
      return
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    console.log('[auth-request] start', {
      path,
      method,
      hasToken: Boolean(token),
      payload: data,
    })
    requestJson({
      url: `${AUTH_API_BASE_URL}${path}`,
      method,
      timeout: 15000,
      headers,
      header: headers,
      data: method === 'GET' ? undefined : data,
    }).then((res) => {
        console.log('[auth-request] response', {
          path,
          method,
          statusCode: res?.statusCode,
          data: res?.data,
        })
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data?.message || `请求失败(${res.statusCode})`))
          return
        }
        resolve(normalizeResponseData(res.data || {}))
      }).catch((error) => {
        console.error('[auth-request] fail', {
          path,
          method,
          error,
          errMsg: error?.errMsg,
          message: error?.message,
        })
        reject(new Error(error?.message || '无法连接服务器'))
      })
  })
}

export function uploadAvatar(token, filePath) {
  return new Promise((resolve, reject) => {
    if (!hasAuthApiBaseUrl()) { reject(new Error('认证服务地址未配置')); return }
    uni.uploadFile({
      url: `${AUTH_API_BASE_URL}/users/me/avatar`,
      filePath,
      name: 'avatar',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        if (res.statusCode < 200 || res.statusCode >= 300) { reject(new Error(data?.message || '上传失败')); return }
        resolve(normalizeResponseData(data))
      },
      fail: () => reject(new Error('上传失败，请检查网络')),
    })
  })
}

export function updateUserProfile(token, payload) {
  return authRequest('/users/me', 'PATCH', token, payload)
}

export function getMyProfile(token) {
  return authRequest('/users/me', 'GET', token, undefined)
}

export function getMyGuides(token) {
  return authRequest('/users/me/guides', 'GET', token, undefined)
}

export function getMyFavoriteGuides(token) {
  return authRequest('/users/me/favorites/guides', 'GET', token, undefined)
}

export function getMyStats(token) {
  return authRequest('/users/me/stats', 'GET', token, undefined)
}

export function getUserProfile(userId, token = '') {
  return authRequest(`/users/${encodeURIComponent(userId)}/profile`, 'GET', token, undefined)
}

export function followUser(token, userId) {
  return authRequest(`/users/${encodeURIComponent(userId)}/follow`, 'POST', token, undefined)
}

export function unfollowUser(token, userId) {
  return authRequest(`/users/${encodeURIComponent(userId)}/follow`, 'DELETE', token, undefined)
}
