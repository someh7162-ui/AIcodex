const HIKING_SESSION_KEY = 'meet-xinjiang-hiking-session'

function buildSessionKey(scope = 'guest') {
  const normalizedScope = String(scope || 'guest').trim() || 'guest'
  return `${HIKING_SESSION_KEY}:${normalizedScope}`
}

function readSession(scope = 'guest') {
  const scopedKey = buildSessionKey(scope)
  const raw = uni.getStorageSync(scopedKey) || (scope === 'guest' ? uni.getStorageSync(HIKING_SESSION_KEY) : '')
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    return null
  }
}

function writeSession(session, scope = 'guest') {
  uni.setStorageSync(buildSessionKey(scope), JSON.stringify(session || {}))
}

export function getHikingSession(scope) {
  return readSession(scope)
}

export function saveHikingSession(session, scope) {
  writeSession(session, scope)
  return session
}

export function updateHikingSessionLocation(location, scope) {
  const session = readSession(scope) || { points: [] }
  const points = Array.isArray(session.points) ? session.points.slice(-119) : []

  points.push({
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    altitude: Number(location.altitude || 0),
    speed: Number(location.speed || 0),
    accuracy: Number(location.accuracy || 0),
    timestamp: Date.now(),
  })

  const nextSession = {
    ...session,
    lastLocation: {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      altitude: Number(location.altitude || 0),
      speed: Number(location.speed || 0),
      accuracy: Number(location.accuracy || 0),
      timestamp: Date.now(),
    },
    points,
    updatedAt: Date.now(),
  }

  writeSession(nextSession, scope)
  return nextSession
}
