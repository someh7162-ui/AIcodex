import { API_BASE_URL } from './api'

export const AUTH_API_BASE_URL = API_BASE_URL
export const AUTH_TOKEN_STORAGE = 'meet-xinjiang-auth-token'
export const AUTH_USER_STORAGE = 'meet-xinjiang-auth-user'

export function hasAuthApiBaseUrl() {
  return Boolean(AUTH_API_BASE_URL && AUTH_API_BASE_URL.trim())
}
