import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getHikingSession, saveHikingSession } from '../common/hiking-session'
import { buildCurrentMarker, buildTrackPolyline, normalizeLocation } from '../common/hiking-metrics'
import { getCurrentLocation } from '../services/amap'

const MAX_TRACK_POINTS = 1200

let listenerBound = false
let locationUpdating = false

export const useHikingStore = defineStore('hiking', () => {
  const isTracking = ref(false)
  const currentLocation = ref(null)
  const trackPoints = ref([])
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

    const location = normalizeLocation(await getCurrentLocation({
      highAccuracy: true,
      allowGpsOffline: true,
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
    const normalized = normalizeLocation(location)
    if (!normalized) {
      return
    }

    const lastPoint = trackPoints.value[trackPoints.value.length - 1]
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

  function persistSession() {
    saveHikingSession({
      isTracking: isTracking.value,
      lastLocation: currentLocation.value,
      points: trackPoints.value,
      updatedAt: Date.now(),
    })
  }

  return {
    isTracking,
    currentLocation,
    trackPoints,
    locationError,
    hasMapLocation,
    mapCenter,
    mapPolyline,
    mapMarkers,
    hydrate,
    refreshLocation,
    startTracking,
    stopTracking,
  }
})
