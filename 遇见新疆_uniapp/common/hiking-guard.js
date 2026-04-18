import { getDistanceKm, normalizeLocation } from './hiking-metrics'

const DEFAULT_DISTANCE_LIMIT_METERS = 40
const DEFAULT_STATIONARY_MINUTES = 25
const SUNSET_STATIONARY_MINUTES = 15
const MAX_STALE_MINUTES = 8

export function evaluateStationaryRisk(options = {}) {
  const {
    isGuardMode = false,
    isTracking = false,
    trackPoints = [],
    currentLocation = null,
    now = Date.now(),
    minutesToSunset = Infinity,
    cooldownUntil = 0,
    lastConfirmedAt = 0,
  } = options

  if (!isGuardMode || !isTracking) {
    return buildIdleResult()
  }

  const normalizedCurrent = normalizeLocation(currentLocation)
  if (!normalizedCurrent) {
    return buildIdleResult()
  }

  const currentTime = Number(now) || Date.now()
  if (currentTime < Number(cooldownUntil || 0)) {
    return buildIdleResult({ thresholdMinutes: getStationaryThresholdMinutes(minutesToSunset) })
  }

  const thresholdMinutes = getStationaryThresholdMinutes(minutesToSunset)
  const staleMinutes = (currentTime - Number(normalizedCurrent.timestamp || 0)) / 60000
  if (!Number.isFinite(staleMinutes) || staleMinutes > MAX_STALE_MINUTES) {
    return buildIdleResult({ thresholdMinutes })
  }

  const points = collectRecentPoints(trackPoints, normalizedCurrent, currentTime, thresholdMinutes)
  if (points.length < 2) {
    return buildIdleResult({ thresholdMinutes })
  }

  const firstTimestamp = Number(points[0].timestamp || 0)
  const observedMinutes = Math.floor((currentTime - firstTimestamp) / 60000)
  if (observedMinutes < thresholdMinutes) {
    return buildIdleResult({ thresholdMinutes, observedMinutes })
  }

  const lastConfirmed = Number(lastConfirmedAt || 0)
  if (lastConfirmed && currentTime - lastConfirmed < thresholdMinutes * 60000) {
    return buildIdleResult({ thresholdMinutes, observedMinutes })
  }

  const distanceMeters = Math.round(sumDistanceMeters(points))
  const isActive = distanceMeters < DEFAULT_DISTANCE_LIMIT_METERS
  return {
    active: isActive,
    observedMinutes,
    thresholdMinutes,
    distanceMeters,
    level: isActive ? (thresholdMinutes <= SUNSET_STATIONARY_MINUTES ? 'danger' : 'warning') : 'safe',
  }
}

export function formatStationaryStatus(risk) {
  if (!risk?.active) {
    return '守护中'
  }

  return `已停留 ${risk.observedMinutes} 分钟`
}

function collectRecentPoints(trackPoints, currentLocation, currentTime, thresholdMinutes) {
  const cutoff = currentTime - thresholdMinutes * 60000
  const combined = [...(Array.isArray(trackPoints) ? trackPoints : []), currentLocation]
    .map(normalizeLocation)
    .filter(Boolean)
    .filter((item) => Number(item.timestamp || 0) >= cutoff)
    .sort((left, right) => Number(left.timestamp || 0) - Number(right.timestamp || 0))

  const unique = []
  const seen = new Set()
  combined.forEach((item) => {
    const key = `${item.timestamp}-${item.latitude.toFixed(6)}-${item.longitude.toFixed(6)}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    unique.push(item)
  })
  return unique
}

function sumDistanceMeters(points) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += getDistanceKm(points[index - 1], points[index]) * 1000
  }
  return total
}

function getStationaryThresholdMinutes(minutesToSunset) {
  const value = Number(minutesToSunset)
  if (Number.isFinite(value) && value <= 120) {
    return SUNSET_STATIONARY_MINUTES
  }
  return DEFAULT_STATIONARY_MINUTES
}

function buildIdleResult(extra = {}) {
  return {
    active: false,
    observedMinutes: 0,
    thresholdMinutes: DEFAULT_STATIONARY_MINUTES,
    distanceMeters: 0,
    level: 'safe',
    ...extra,
  }
}
