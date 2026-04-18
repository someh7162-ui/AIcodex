import { normalizeLocation, sumTrackDistanceKm } from './hiking-metrics'

export function normalizeGuideTrack(track) {
  if (!track) {
    return null
  }

  const source = Array.isArray(track) ? { points: track } : track
  const points = Array.isArray(source.points)
    ? source.points.map(normalizeLocation).filter(Boolean)
    : []

  if (!points.length) {
    return null
  }

  const startPoint = points[0]
  const endPoint = points[points.length - 1]
  const durationMs = resolveTrackDuration(source.durationMs, startPoint, endPoint)
  const distanceKm = resolveTrackDistance(source.distanceKm, points)
  const altitudeGain = resolveAltitudeGain(source.altitudeGain, points)

  return {
    points,
    pointCount: Number(source.pointCount) || points.length,
    startPoint,
    endPoint,
    distanceKm,
    durationMs,
    altitudeGain,
    capturedAt: Number(source.capturedAt) || endPoint.timestamp || Date.now(),
  }
}

export function createGuideTrackPayload(points = [], extras = {}) {
  const normalized = normalizeGuideTrack({ points, ...extras })
  if (!normalized) {
    return null
  }

  return {
    points: normalized.points,
    pointCount: normalized.pointCount,
    distanceKm: normalized.distanceKm,
    durationMs: normalized.durationMs,
    altitudeGain: normalized.altitudeGain,
    capturedAt: normalized.capturedAt,
    startPoint: normalized.startPoint,
    endPoint: normalized.endPoint,
  }
}

export function formatTrackDuration(durationMs) {
  const totalMinutes = Math.max(0, Math.round(Number(durationMs || 0) / 60000))
  if (!totalMinutes) {
    return '刚开始'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) {
    return `${minutes} 分钟`
  }
  if (!minutes) {
    return `${hours} 小时`
  }
  return `${hours} 小时 ${minutes} 分钟`
}

function resolveTrackDuration(rawDuration, startPoint, endPoint) {
  const durationMs = Number(rawDuration)
  if (Number.isFinite(durationMs) && durationMs > 0) {
    return durationMs
  }

  const startTime = Number(startPoint?.timestamp || 0)
  const endTime = Number(endPoint?.timestamp || 0)
  if (startTime > 0 && endTime >= startTime) {
    return endTime - startTime
  }

  return 0
}

function resolveTrackDistance(rawDistance, points) {
  const distanceKm = Number(rawDistance)
  if (Number.isFinite(distanceKm) && distanceKm > 0) {
    return distanceKm
  }

  return sumTrackDistanceKm(points)
}

function resolveAltitudeGain(rawAltitudeGain, points) {
  const altitudeGain = Number(rawAltitudeGain)
  if (Number.isFinite(altitudeGain) && altitudeGain > 0) {
    return altitudeGain
  }

  let totalGain = 0
  for (let index = 1; index < points.length; index += 1) {
    const delta = Number(points[index]?.altitude || 0) - Number(points[index - 1]?.altitude || 0)
    if (delta > 0) {
      totalGain += delta
    }
  }

  return totalGain
}
