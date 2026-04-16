import { AUTH_TOKEN_STORAGE, AUTH_USER_STORAGE } from '../config/auth'

export function getStoredAuthToken() {
  const token = uni.getStorageSync(AUTH_TOKEN_STORAGE)
  return typeof token === 'string' ? token : ''
}

export function getStoredAuthUser() {
  try {
    const raw = uni.getStorageSync(AUTH_USER_STORAGE)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

export function saveAuthSession({ token, user }) {
  uni.setStorageSync(AUTH_TOKEN_STORAGE, token || '')
  uni.setStorageSync(AUTH_USER_STORAGE, JSON.stringify(user || null))
}

export function clearAuthSession() {
  uni.removeStorageSync(AUTH_TOKEN_STORAGE)
  uni.removeStorageSync(AUTH_USER_STORAGE)
}
