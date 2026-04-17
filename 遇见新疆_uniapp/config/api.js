export const API_BASE_URL = 'https://111.20.31.227:34144/api'

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim())
}
