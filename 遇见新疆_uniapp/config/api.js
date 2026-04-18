export const API_ORIGIN = 'https://yd.frp-arm.com:44637'
export const API_BASE_URL = `${API_ORIGIN}/api`

const LEGACY_API_ORIGINS = [
  'https://111.20.31.227:34144',
  'http://111.20.31.227:34144',
  'https://frp-arm.com:44637',
  'http://frp-arm.com:44637',
]

const LEGACY_API_HOSTS = [
  '111.20.31.227:34144',
  'frp-arm.com:44637',
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

  const matchedHost = LEGACY_API_HOSTS.find((host) => {
    return raw === host || raw.startsWith(`${host}/`) || raw.startsWith(`${host}?`)
  })

  if (matchedHost) {
    const suffix = raw.slice(matchedHost.length)
    return suffix.startsWith('/') || suffix.startsWith('?')
      ? `${API_ORIGIN}${suffix}`
      : `${API_ORIGIN}/${suffix}`
  }

  if (raw.startsWith('/')) {
    return `${API_ORIGIN}${raw}`
  }

  return `${API_ORIGIN}/${raw}`
}

export function hasApiBaseUrl() {
  return Boolean(API_BASE_URL && API_BASE_URL.trim())
}
