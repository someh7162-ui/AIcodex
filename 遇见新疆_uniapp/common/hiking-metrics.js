export function normalizeLocation(location) {
  if (!location) {
    return null
  }

  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    latitude,
    longitude,
    altitude: Number(location.altitude || 0),
    accuracy: Number(location.accuracy || 0),
    speed: Number(location.speed || 0),
    bearing: Number(location.bearing || location.heading || 0),
    timestamp: Number(location.timestamp || Date.now()),
    segmentIndex: Number.isFinite(Number(location.segmentIndex)) ? Number(location.segmentIndex) : 0,
    provider: String(location.provider || location.sourceProvider || ''),
    source: String(location.source || ''),
    coordinateSystem: String(location.coordinateSystem || location.coordsType || ''),
  }
}

export function formatCoordinate(value, type) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }

  const suffix = type === 'lat'
    ? (numeric >= 0 ? 'N' : 'S')
    : (numeric >= 0 ? 'E' : 'W')

  return `${Math.abs(numeric).toFixed(5)}°${suffix}`
}

export function getDistanceKm(from, to) {
  const start = normalizeLocation(from)
  const end = normalizeLocation(to)
  if (!start || !end) {
    return 0
  }

  const rad = Math.PI / 180
  const lat1 = start.latitude * rad
  const lat2 = end.latitude * rad
  const deltaLat = lat2 - lat1
  const deltaLng = (end.longitude - start.longitude) * rad
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function sumTrackDistanceKm(points = []) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0
  }

  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = normalizeLocation(points[index - 1])
    const current = normalizeLocation(points[index])
    if (!previous || !current) {
      continue
    }

    if (Number(previous.segmentIndex || 0) !== Number(current.segmentIndex || 0)) {
      continue
    }

    total += getDistanceKm(previous, current)
  }

  return total
}

export function buildTrackPolyline(points = []) {
  if (!Array.isArray(points) || !points.length) {
    return []
  }

  const normalizedPoints = points.map(normalizeLocation).filter(Boolean)
  const segments = []
  let currentSegmentKey = null
  let currentSegmentPoints = []

  normalizedPoints.forEach((item) => {
    const nextKey = Number(item.segmentIndex || 0)
    if (currentSegmentKey === null || currentSegmentKey !== nextKey) {
      if (currentSegmentPoints.length) {
        segments.push(currentSegmentPoints)
      }
      currentSegmentKey = nextKey
      currentSegmentPoints = []
    }

    currentSegmentPoints.push({ latitude: item.latitude, longitude: item.longitude })
  })

  if (currentSegmentPoints.length) {
    segments.push(currentSegmentPoints)
  }

  return segments
    .filter((segment) => segment.length)
    .map((segment) => ({
      points: segment,
      color: '#FF7A00',
      width: 5,
      borderColor: '#C14F00',
      borderWidth: 1,
    }))
}

export function buildCurrentMarker(location, isTracking = false, profile = {}) {
  const normalized = normalizeLocation(location)
  if (!normalized) {
    return []
  }

  const avatarUrl = String(profile.avatarUrl || '').trim()
  const avatarInitial = String(profile.avatarInitial || '游').trim().slice(0, 1) || '游'
  const statusText = isTracking ? '记录中' : '当前位置'

  return [
    {
      id: 1,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      width: 44,
      height: 44,
      avatarUrl,
      avatarInitial,
      statusText,
      callout: {
        content: statusText,
        display: 'ALWAYS',
        fontSize: 11,
        borderRadius: 12,
        bgColor: '#1C1C1E',
        color: '#FFFFFF',
        padding: 6,
      },
    },
  ]
}

export function formatMetric(value, digits = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '--'
  }

  return numeric.toFixed(digits)
}
