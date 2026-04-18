import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createGuideTrackPayload, normalizeGuideTrack } from '../common/guide-track'
import { gcj02ToWgs84 } from '../common/coord-transform'
import { getHikingSession, saveHikingSession } from '../common/hiking-session'
import { buildCurrentMarker, buildTrackPolyline, getDistanceKm, normalizeLocation } from '../common/hiking-metrics'
import { getCurrentLocation } from '../services/amap'

const MAX_TRACK_POINTS = 1200
const MAX_SAVED_TRACKS = 6
const MAX_ACCEPTABLE_ACCURACY = 80
const MIN_MOVEMENT_METERS = 5
const MAX_HIKING_SPEED_MPS = 3.6
const MAX_WALKING_JUMP_METERS = 60

let listenerBound = false
let locationUpdating = false

export const useHikingStore = defineStore('hiking', () => {
  const isTracking = ref(false)
  const currentLocation = ref(null)
  const trackPoints = ref([])
  const savedTracks = ref([])
  const locationError = ref('')
  const hydrated = ref(false)

  const mapCenter = computed(() => {
    if (!currentLocation.value) {
      return null
    }

    return {
      latitude: currentLocation.value.latitude,
      longitude: currentLocation.value.longitude,
    }
  })

  const hasMapLocation = computed(() => Boolean(mapCenter.value))
  const mapPolyline = computed(() => buildTrackPolyline(trackPoints.value))
  const mapMarkers = computed(() => buildCurrentMarker(currentLocation.value, isTracking.value))

  function hydrate() {
    if (hydrated.value) {
      return
    }

    const session = getHikingSession()
    if (session) {
      currentLocation.value = normalizeLocation(session.lastLocation)
      trackPoints.value = Array.isArray(session.points)
        ? session.points.map(normalizeLocation).filter(Boolean)
        : []
      savedTracks.value = Array.isArray(session.savedTracks)
        ? session.savedTracks.map(normalizeSavedTrack).filter(Boolean)
        : []
      isTracking.value = Boolean(session.isTracking)
    }

    hydrated.value = true

    if (isTracking.value) {
      ensureLocationListener()
      startLocationUpdates().catch((error) => {
        locationError.value = error?.message || '定位监听启动失败'
      })
    }
  }

  function ensureLocationListener() {
    if (listenerBound || typeof uni.onLocationChange !== 'function') {
      return
    }

    uni.onLocationChange((payload) => {
      const nextLocation = normalizeLocation({
        ...payload,
        provider: payload?.provider || payload?.sourceProvider || 'uni-location-update',
        source: payload?.source || 'uni.onLocationChange',
      })

      if (!nextLocation) {
        return
      }

      currentLocation.value = nextLocation
      locationError.value = ''

      if (isTracking.value) {
        appendTrackPoint(nextLocation)
      } else {
        persistSession()
      }
    })

    listenerBound = true
  }

  async function startLocationUpdates() {
    if (locationUpdating || typeof uni.startLocationUpdate !== 'function') {
      return
    }

    locationUpdating = true

    await new Promise((resolve, reject) => {
      uni.startLocationUpdate({
        success: resolve,
        fail: reject,
      })
    })
  }

  async function startTracking() {
    hydrate()
    ensureLocationListener()

    try {
      await startLocationUpdates()
      isTracking.value = true
      locationError.value = ''
      persistSession()

      if (!currentLocation.value) {
        await refreshLocation({ appendWhenTracking: true })
      }
    } catch (error) {
      isTracking.value = false
      locationError.value = error?.message || '开始记录失败'
      persistSession()
      throw error
    }
  }

  async function stopTracking() {
    isTracking.value = false
    persistSession()

    if (typeof uni.stopLocationUpdate !== 'function') {
      locationUpdating = false
      return
    }

    await new Promise((resolve) => {
      uni.stopLocationUpdate({
        complete: () => {
          locationUpdating = false
          resolve()
        },
      })
    })
  }

  async function refreshLocation(options = {}) {
    hydrate()

    const location = normalizeTrackLocation(await getCurrentLocation({
      highAccuracy: true,
      allowGpsOffline: true,
      coordsType: 'wgs84',
      providers: ['gps', 'system', 'wgs84', 'network'],
      gpsTimeout: 18000,
      networkTimeout: 6000,
      ...options,
    }))

    if (!location) {
      throw new Error('定位结果无效')
    }

    currentLocation.value = location
    locationError.value = ''

    if (isTracking.value || options.appendWhenTracking) {
      appendTrackPoint(location)
    } else {
      persistSession()
    }

    return location
  }

  function appendTrackPoint(location) {
    const normalized = normalizeTrackLocation(location)
    if (!normalized) {
      return
    }

    const lastPoint = trackPoints.value[trackPoints.value.length - 1]
    if (shouldSkipTrackPoint(normalized, lastPoint)) {
      if (!currentLocation.value || shouldReplaceCurrentLocation(currentLocation.value, normalized)) {
        currentLocation.value = normalized
        persistSession()
      }
      return
    }

    if (
      lastPoint &&
      Math.abs(lastPoint.latitude - normalized.latitude) < 0.000001 &&
      Math.abs(lastPoint.longitude - normalized.longitude) < 0.000001 &&
      Math.abs((lastPoint.timestamp || 0) - (normalized.timestamp || 0)) < 1500
    ) {
      currentLocation.value = normalized
      persistSession()
      return
    }

    trackPoints.value = [...trackPoints.value, normalized].slice(-MAX_TRACK_POINTS)
    currentLocation.value = normalized
    persistSession()
  }

  async function finishTracking() {
    hydrate()

    const savedTrack = createSavedTrack(trackPoints.value)
    await stopTracking()

    if (!savedTrack) {
      throw new Error('当前轨迹太短，至少记录两个有效点后再结束')
    }

    savedTracks.value = [savedTrack, ...savedTracks.value.filter((item) => item.id !== savedTrack.id)].slice(0, MAX_SAVED_TRACKS)
    trackPoints.value = []
    persistSession()
    return savedTrack
  }

  function clearSavedTrack(trackId) {
    savedTracks.value = savedTracks.value.filter((item) => item.id !== trackId)
    persistSession()
  }

  function createSavedTrack(points) {
    const payload = createGuideTrackPayload(points)
    if (!payload) {
      return null
    }

    return {
      id: `track-${payload.capturedAt}`,
      title: formatSavedTrackTitle(payload.capturedAt),
      ...payload,
    }
  }

  function normalizeSavedTrack(track) {
    const normalized = normalizeGuideTrack(track)
    if (!normalized) {
      return null
    }

    return {
      id: String(track.id || `track-${normalized.capturedAt}`),
      title: String(track.title || formatSavedTrackTitle(normalized.capturedAt)),
      ...normalized,
    }
  }

  function normalizeTrackLocation(location) {
    const normalized = normalizeLocation(location)
    if (!normalized) {
      return null
    }

    if (shouldConvertGcjToWgs84(normalized)) {
      const converted = gcj02ToWgs84(normalized.longitude, normalized.latitude)
      if (converted) {
        normalized.longitude = converted.longitude
        normalized.latitude = converted.latitude
        normalized.coordinateSystem = 'wgs84'
      }
    }

    return normalized
  }

  function shouldConvertGcjToWgs84(location) {
    if (!isAppRuntime()) {
      return false
    }

    const coordinateSystem = String(location.coordinateSystem || '').toLowerCase()
    const source = String(location.source || '').toLowerCase()
    return coordinateSystem.includes('gcj') || source.includes('onlocationchange') || source.includes('plus.geolocation')
  }

  function shouldSkipTrackPoint(nextPoint, lastPoint) {
    const accuracy = Number(nextPoint.accuracy || 0)
    if (accuracy > MAX_ACCEPTABLE_ACCURACY) {
      return true
    }

    if (!lastPoint) {
      return false
    }

    const distanceMeters = getDistanceKm(lastPoint, nextPoint) * 1000
    const elapsedSeconds = Math.max(1, (Number(nextPoint.timestamp || 0) - Number(lastPoint.timestamp || 0)) / 1000)
    const inferredSpeed = distanceMeters / elapsedSeconds

    if (distanceMeters < MIN_MOVEMENT_METERS && accuracy > 15) {
      return true
    }

    if (distanceMeters > MAX_WALKING_JUMP_METERS && inferredSpeed > MAX_HIKING_SPEED_MPS && accuracy > 20) {
      return true
    }

    return false
  }

  function shouldReplaceCurrentLocation(previous, nextPoint) {
    const previousAccuracy = Number(previous?.accuracy || 0)
    const nextAccuracy = Number(nextPoint?.accuracy || 0)
    if (!previousAccuracy) {
      return true
    }
    return !nextAccuracy || nextAccuracy <= previousAccuracy
  }

  function formatSavedTrackTitle(timestamp) {
    const date = new Date(Number(timestamp || Date.now()))
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes} 徒步轨迹`
  }

  function isAppRuntime() {
    return typeof plus !== 'undefined' && plus.os?.name === 'Android'
  }

  function persistSession() {
    saveHikingSession({
      isTracking: isTracking.value,
      lastLocation: currentLocation.value,
      points: trackPoints.value,
      savedTracks: savedTracks.value,
      updatedAt: Date.now(),
    })
  }

  return {
    isTracking,
    currentLocation,
    trackPoints,
    savedTracks,
    locationError,
    hasMapLocation,
    mapCenter,
    mapPolyline,
    mapMarkers,
    hydrate,
    refreshLocation,
    startTracking,
    stopTracking,
    finishTracking,
    clearSavedTrack,
  }
})
