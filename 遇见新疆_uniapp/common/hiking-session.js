const HIKING_SESSION_KEY = 'meet-xinjiang-hiking-session'

function readSession() {
  const raw = uni.getStorageSync(HIKING_SESSION_KEY)
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

function writeSession(session) {
  uni.setStorageSync(HIKING_SESSION_KEY, JSON.stringify(session || {}))
}

export function getHikingSession() {
  return readSession()
}

export function saveHikingSession(session) {
  writeSession(session)
  return session
}

export function updateHikingSessionLocation(location) {
  const session = readSession() || { points: [] }
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

  writeSession(nextSession)
  return nextSession
}
