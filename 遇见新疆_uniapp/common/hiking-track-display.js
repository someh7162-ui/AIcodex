import { normalizeLocation } from './hiking-metrics'

const EARTH_RADIUS_METERS = 6378137

export function simplifyTrackPoints(points = [], zoom = 16) {
  const normalized = Array.isArray(points)
    ? points.map(normalizeLocation).filter(Boolean).map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }))
    : []

  if (normalized.length <= 2) {
    return normalized
  }

  const filtered = filterNearbyPoints(normalized, resolveMinDistanceMeters(zoom))
  if (filtered.length <= 2) {
    return filtered
  }

  return douglasPeucker(filtered, resolveToleranceMeters(zoom))
}

function filterNearbyPoints(points, minDistanceMeters) {
  if (points.length <= 2 || minDistanceMeters <= 0) {
    return points.slice()
  }

  const filtered = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    if (getDistanceMeters(filtered[filtered.length - 1], points[index]) >= minDistanceMeters) {
      filtered.push(points[index])
    }
  }
  filtered.push(points[points.length - 1])
  return filtered
}

function douglasPeucker(points, toleranceMeters) {
  if (points.length <= 2 || toleranceMeters <= 0) {
    return points.slice()
  }

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  let maxDistance = 0
  let splitIndex = -1

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = getPerpendicularDistanceMeters(points[index], firstPoint, lastPoint)
    if (distance > maxDistance) {
      maxDistance = distance
      splitIndex = index
    }
  }

  if (maxDistance <= toleranceMeters || splitIndex === -1) {
    return [firstPoint, lastPoint]
  }

  const left = douglasPeucker(points.slice(0, splitIndex + 1), toleranceMeters)
  const right = douglasPeucker(points.slice(splitIndex), toleranceMeters)
  return [...left.slice(0, -1), ...right]
}

function getPerpendicularDistanceMeters(point, lineStart, lineEnd) {
  const start = projectToMeters(lineStart)
  const end = projectToMeters(lineEnd)
  const target = projectToMeters(point)

  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) {
    return Math.hypot(target.x - start.x, target.y - start.y)
  }

  const ratio = ((target.x - start.x) * dx + (target.y - start.y) * dy) / (dx * dx + dy * dy)
  const projection = ratio <= 0
    ? start
    : ratio >= 1
      ? end
      : {
          x: start.x + dx * ratio,
          y: start.y + dy * ratio,
        }

  return Math.hypot(target.x - projection.x, target.y - projection.y)
}

function getDistanceMeters(from, to) {
  const start = projectToMeters(from)
  const end = projectToMeters(to)
  return Math.hypot(end.x - start.x, end.y - start.y)
}

function projectToMeters(point) {
  const longitude = Number(point?.longitude || 0)
  const latitude = clampLatitude(Number(point?.latitude || 0))
  const x = (longitude * Math.PI * EARTH_RADIUS_METERS) / 180
  const y = Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) * EARTH_RADIUS_METERS
  return { x, y }
}

function resolveToleranceMeters(zoom) {
  const numericZoom = Math.round(Number(zoom || 16))
  if (numericZoom >= 17) return 0.8
  if (numericZoom >= 16) return 1.5
  if (numericZoom >= 15) return 3
  if (numericZoom >= 14) return 6
  if (numericZoom >= 13) return 12
  if (numericZoom >= 12) return 20
  return 30
}

function resolveMinDistanceMeters(zoom) {
  const numericZoom = Math.round(Number(zoom || 16))
  if (numericZoom >= 17) return 0
  if (numericZoom >= 16) return 0.5
  if (numericZoom >= 15) return 1
  if (numericZoom >= 14) return 2
  if (numericZoom >= 13) return 4
  return 6
}

function clampLatitude(value) {
  return Math.max(-85.05112878, Math.min(85.05112878, value))
}
