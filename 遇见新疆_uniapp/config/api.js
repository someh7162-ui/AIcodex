export const API_ORIGIN = 'https://yd.frp-arm.com:44637'
export const API_BASE_URL = `${API_ORIGIN}/api`

const LEGACY_API_ORIGINS = [
  'https://111.20.31.227:34144',
  'https://frp-arm.com:44637',
]

export function normalizeApiAssetUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  if (/^https?:\/\//i.test(raw)) {
    const matched = LEGACY_API_ORIGINS.find((origin) => raw.startsWith(origin))
    return matched ? `${API_ORIGIN}${raw.slice(matched.length)}` : raw
  }

  if (raw.startsWith('/')) {
    return `${API_ORIGIN}${raw}`
  }

  return `${API_ORIGIN}/${raw}`
}

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim())
}
