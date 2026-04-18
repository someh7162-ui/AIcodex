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

  return `${Math.abs(numeric).toFixed(5)}deg${suffix}`
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
    total += getDistanceKm(points[index - 1], points[index])
  }

  return total
}

export function buildTrackPolyline(points = []) {
  if (!Array.isArray(points) || !points.length) {
    return []
  }

  return [
    {
      points: points
        .map(normalizeLocation)
        .filter(Boolean)
        .map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
      color: '#FF7A00',
      width: 5,
      borderColor: '#C14F00',
      borderWidth: 1,
    },
  ]
}

export function buildCurrentMarker(location, isTracking = false) {
  const normalized = normalizeLocation(location)
  if (!normalized) {
    return []
  }

  return [
    {
      id: 1,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      width: 30,
      height: 30,
      callout: {
        content: isTracking ? '记录中' : '当前位置',
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
