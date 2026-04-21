const HIKING_SAVED_TRACKS_KEY = 'meet-xinjiang-hiking-saved-tracks'

function buildStorageKey(scope = 'guest') {
  const normalizedScope = String(scope || 'guest').trim() || 'guest'
  return `${HIKING_SAVED_TRACKS_KEY}:${normalizedScope}`
}

function normalizeTrackId(track) {
  return String(track?.id || track?.capturedAt || '').trim()
}

function readStorage(scope = 'guest') {
  const raw = uni.getStorageSync(buildStorageKey(scope))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function writeStorage(scope, list) {
  uni.setStorageSync(buildStorageKey(scope), JSON.stringify(Array.isArray(list) ? list : []))
}

export function getSavedHikingTracks(scope) {
  return readStorage(scope)
}

export function saveSavedHikingTracks(scope, tracks) {
  writeStorage(scope, tracks)
  return Array.isArray(tracks) ? tracks : []
}

export function clearSavedHikingTracks(scope) {
  writeStorage(scope, [])
  return []
}

export function upsertSavedHikingTrack(scope, track) {
  const nextId = normalizeTrackId(track)
  const current = readStorage(scope)
  const filtered = nextId ? current.filter((item) => normalizeTrackId(item) !== nextId) : current
  const next = [track, ...filtered]
  writeStorage(scope, next)
  return next
}

export function removeSavedHikingTrack(scope, trackId) {
  const normalizedTrackId = String(trackId || '').trim()
  const next = readStorage(scope).filter((item) => normalizeTrackId(item) !== normalizedTrackId)
  writeStorage(scope, next)
  return next
}

export function updateSavedHikingTrack(scope, trackId, updater) {
  const normalizedTrackId = String(trackId || '').trim()
  const current = readStorage(scope)
  const next = current.map((item) => {
    if (normalizeTrackId(item) !== normalizedTrackId) {
      return item
    }

    const updated = typeof updater === 'function' ? updater(item) : { ...item, ...(updater || {}) }
    return updated || item
  })
  writeStorage(scope, next)
  return next
}
