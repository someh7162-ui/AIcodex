const GUIDE_TRACK_PREVIEW_STORAGE_KEY = 'guide-track-preview-payload'
let guideTrackPreviewMemory = null

export function saveGuideTrackPreview(payload) {
  guideTrackPreviewMemory = normalizeGuideTrackPreviewPayload(payload)
  console.log('[guide-track-preview] save payload', summarizeGuideTrackPreviewPayload(guideTrackPreviewMemory))
}

export function loadGuideTrackPreview() {
  if (guideTrackPreviewMemory) {
    console.log('[guide-track-preview] load from memory', summarizeGuideTrackPreviewPayload(guideTrackPreviewMemory))
    return guideTrackPreviewMemory
  }

  try {
    const raw = uni.getStorageSync(GUIDE_TRACK_PREVIEW_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    guideTrackPreviewMemory = normalizeGuideTrackPreviewPayload(parsed)
    console.log('[guide-track-preview] load from storage', summarizeGuideTrackPreviewPayload(guideTrackPreviewMemory))
    return guideTrackPreviewMemory
  } catch (error) {
    console.error('[guide-track-preview] load failed', error)
    return null
  }
}

export function clearGuideTrackPreview() {
  console.log('[guide-track-preview] clear payload')
  guideTrackPreviewMemory = null

  try {
    uni.removeStorageSync(GUIDE_TRACK_PREVIEW_STORAGE_KEY)
  } catch (error) {
  }
}

function normalizeGuideTrackPreviewPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const track = payload.track && typeof payload.track === 'object'
    ? {
        points: Array.isArray(payload.track.points)
          ? payload.track.points.map((point) => ({
              latitude: Number(point?.latitude),
              longitude: Number(point?.longitude),
              altitude: Number(point?.altitude || 0),
              timestamp: Number(point?.timestamp || 0),
            }))
          : [],
        pointCount: Number(payload.track.pointCount || 0),
        distanceKm: Number(payload.track.distanceKm || 0),
        durationMs: Number(payload.track.durationMs || 0),
        altitudeGain: Number(payload.track.altitudeGain || 0),
        capturedAt: Number(payload.track.capturedAt || 0),
      }
    : null

  if (!track?.points?.length) {
    return null
  }

  return {
    title: String(payload.title || ''),
    track,
  }
}

function summarizeGuideTrackPreviewPayload(payload) {
  if (!payload) {
    return null
  }

  return {
    title: payload.title,
    pointCount: Number(payload.track?.pointCount || payload.track?.points?.length || 0),
    pointsLength: Array.isArray(payload.track?.points) ? payload.track.points.length : 0,
    distanceKm: Number(payload.track?.distanceKm || 0),
  }
}
