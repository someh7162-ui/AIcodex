import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createGuideTrackPayload, normalizeGuideTrack } from '../common/guide-track'
import { gcj02ToWgs84 } from '../common/coord-transform'
import {
  clearSavedHikingTracks,
  getSavedHikingTracks,
  removeSavedHikingTrack,
  saveSavedHikingTracks,
  updateSavedHikingTrack,
  upsertSavedHikingTrack,
} from '../common/hiking-saved-tracks'
import { getHikingSession, saveHikingSession } from '../common/hiking-session'
import { getStoredAuthToken, getStoredAuthUser } from '../common/auth-storage'
import { buildCurrentMarker, buildTrackPolyline, getDistanceKm, normalizeLocation } from '../common/hiking-metrics'
import { getCurrentLocation } from '../services/amap'
import {
  createMyHikingTrack,
  deleteMyHikingTrack,
  getMyHikingTracks,
  hasHikingTrackApi,
  updateMyHikingTrack,
} from '../services/hiking-tracks'

const MAX_TRACK_POINTS = 1200
const MAX_ACCEPTABLE_ACCURACY = 120
const MIN_MOVEMENT_METERS = 2
const MAX_HIKING_SPEED_MPS = 5.5
const MAX_WALKING_JUMP_METERS = 120

let listenerBound = false
let locationUpdating = false
let trackingPollTimer = null

export const useHikingStore = defineStore('hiking', () => {
  const isTracking = ref(false)
  const currentLocation = ref(null)
  const trackPoints = ref([])
  const trackingStartedAt = ref(0)
  const trackingActiveFrom = ref(0)
  const accumulatedDurationMs = ref(0)
  const currentSegmentIndex = ref(0)
  const savedTracks = ref([])
  const locationError = ref('')
  const hydrated = ref(false)
  const savedTracksLoading = ref(false)
  const activeUserId = ref('guest')
  const activeToken = ref('')
  const loadTracksPromise = ref(null)
  const trackSyncState = ref('idle')

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
  const hasTrackInProgress = computed(() => Boolean(trackPoints.value.length || trackingStartedAt.value))
  const trackDurationMs = computed(() => getElapsedTrackingDuration())
  const pendingSyncCount = computed(() => savedTracks.value.filter((item) => isLocalTrackId(item?.id)).length)
  const currentUserProfile = computed(() => {
    const user = getStoredAuthUser() || null
    const nickname = String(user?.nickname || '旅行者').trim()
    return {
      avatarUrl: String(user?.avatar_url || user?.avatar || '').trim(),
      avatarInitial: (nickname || '旅').slice(0, 1),
    }
  })
  const trackSyncText = computed(() => {
    if (savedTracksLoading.value && activeToken.value) {
      return pendingSyncCount.value ? `正在同步 ${pendingSyncCount.value} 条本地轨迹` : '正在同步云端轨迹'
    }

    if (pendingSyncCount.value > 0) {
      if (!activeToken.value || activeUserId.value === 'guest') {
        return `已本地保存 ${pendingSyncCount.value} 条轨迹，登录后自动同步`
      }
      return `${pendingSyncCount.value} 条轨迹待同步重试`
    }

    if (trackSyncState.value === 'synced') {
      return '轨迹已同步到云端'
    }

    if (trackSyncState.value === 'saved') {
      return '轨迹已保存'
    }

    return ''
  })
  const trackSyncTone = computed(() => {
    if (savedTracksLoading.value && activeToken.value) {
      return 'syncing'
    }
    if (pendingSyncCount.value > 0) {
      return activeToken.value && activeUserId.value !== 'guest' ? 'warning' : 'local'
    }
    if (trackSyncState.value === 'synced') {
      return 'synced'
    }
    return 'neutral'
  })
  const mapMarkers = computed(() => buildCurrentMarker(currentLocation.value, isTracking.value, currentUserProfile.value))

  function getSessionScope() {
    return activeUserId.value || 'guest'
  }

  function readAuthScope() {
    const user = getStoredAuthUser()
    return {
      userId: String(user?.id || 'guest'),
      token: getStoredAuthToken(),
    }
  }

  function hydrateSession(scope = getSessionScope()) {
    const session = getHikingSession(scope)
    currentLocation.value = normalizeLocation(session?.lastLocation)
    trackPoints.value = Array.isArray(session?.points)
      ? session.points.map(normalizeLocation).filter(Boolean)
      : []
    trackingStartedAt.value = Number(session?.trackingStartedAt || 0)
    trackingActiveFrom.value = Number(session?.trackingActiveFrom || 0)
    accumulatedDurationMs.value = Math.max(0, Number(session?.accumulatedDurationMs || 0))
    currentSegmentIndex.value = resolveNextSegmentIndex(trackPoints.value, Number(session?.currentSegmentIndex || 0))
    isTracking.value = Boolean(session?.isTracking)

    if (isTracking.value && !trackingStartedAt.value) {
      trackingStartedAt.value = Number(trackPoints.value[0]?.timestamp || session?.updatedAt || Date.now())
    }

    if (isTracking.value && !trackingActiveFrom.value) {
      trackingActiveFrom.value = Number(session?.updatedAt || Date.now())
    }
  }

  function loadLocalSavedTracks(scope = getSessionScope()) {
    return getSavedHikingTracks(scope)
      .map(normalizeSavedTrack)
      .filter(Boolean)
  }

  function persistSavedTracks(scope = getSessionScope()) {
    return saveSavedHikingTracks(scope, savedTracks.value)
  }

  function syncAuthScope() {
    const previousScope = activeUserId.value || 'guest'
    const shouldAdoptGuestTracks = previousScope === 'guest'
    const nextScope = readAuthScope()
    const scopeChanged = nextScope.userId !== activeUserId.value
    const tokenChanged = nextScope.token !== activeToken.value

    if (!scopeChanged && !tokenChanged) {
      return { ...nextScope, scopeChanged: false, tokenChanged: false }
    }

    activeUserId.value = nextScope.userId
    activeToken.value = nextScope.token
    loadTracksPromise.value = null
    const scopedTracks = mergeSavedTracks(
      loadLocalSavedTracks(nextScope.userId),
      shouldAdoptGuestTracks && nextScope.userId !== 'guest' ? loadLocalSavedTracks(previousScope) : []
    )
    savedTracks.value = scopedTracks
    persistSavedTracks(nextScope.userId)
    if (previousScope !== nextScope.userId && previousScope === 'guest' && nextScope.userId !== 'guest') {
      clearSavedHikingTracks(previousScope)
    }
    savedTracksLoading.value = false
    if (scopedTracks.length && !pendingSyncCount.value) {
      trackSyncState.value = nextScope.userId === 'guest' ? 'saved' : 'synced'
    }
    hydrateSession(nextScope.userId)

    return {
      ...nextScope,
      scopeChanged,
      tokenChanged,
    }
  }

  function hydrate() {
    const authScope = syncAuthScope()

    if (!hydrated.value) {
      hydrateSession(authScope.userId)
      hydrated.value = true
    }

    if (isTracking.value) {
      ensureLocationListener()
      startLocationUpdates().catch((error) => {
        locationError.value = error?.message || '定位监听启动失败'
      })
    }

    return authScope
  }

  function ensureLocationListener() {
    if (listenerBound || typeof uni.onLocationChange !== 'function') {
      return
    }

    uni.onLocationChange((payload) => {
      const nextLocation = normalizeTrackLocation({
        ...payload,
        provider: payload?.provider || payload?.sourceProvider || 'uni-location-update',
        source: payload?.source || 'uni.onLocationChange',
      })

      if (!nextLocation) {
        console.warn('[hiking-track] receive invalid live point', payload)
        return
      }

      console.log('[hiking-track] receive live point', {
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        accuracy: nextLocation.accuracy,
        provider: nextLocation.provider,
        source: nextLocation.source,
        coordinateSystem: nextLocation.coordinateSystem,
      })

      if (isTracking.value) {
        appendTrackPoint(nextLocation)
      } else {
        currentLocation.value = nextLocation
        locationError.value = ''
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

  async function loadSavedTracks(options = {}) {
    const authScope = hydrate()

    if (!activeToken.value || activeUserId.value === 'guest') {
      savedTracks.value = loadLocalSavedTracks(activeUserId.value)
      trackSyncState.value = savedTracks.value.length ? 'saved' : 'idle'
      loadTracksPromise.value = null
      return savedTracks.value
    }

    if (!hasHikingTrackApi()) {
      savedTracks.value = loadLocalSavedTracks(activeUserId.value)
      trackSyncState.value = pendingSyncCount.value ? 'local' : 'saved'
      return savedTracks.value
    }

    if (!options.force && !authScope.scopeChanged && !authScope.tokenChanged && loadTracksPromise.value) {
      return loadTracksPromise.value
    }

    savedTracksLoading.value = true
    trackSyncState.value = 'syncing'
    const currentScope = activeUserId.value
    const currentToken = activeToken.value

    const request = getMyHikingTracks(currentToken)
      .then(async (list) => {
        if (activeUserId.value !== currentScope || activeToken.value !== currentToken) {
          return savedTracks.value
        }

        const remoteTracks = list.map(normalizeSavedTrack).filter(Boolean)
        const localTracks = loadLocalSavedTracks(currentScope)
        const uploadedTracks = await syncPendingLocalTracks(localTracks, remoteTracks, currentToken)
        const mergedTracks = mergeSavedTracks(remoteTracks, uploadedTracks)
        savedTracks.value = mergedTracks
        persistSavedTracks(currentScope)
        persistSession()
        trackSyncState.value = mergedTracks.some((item) => isLocalTrackId(item?.id)) ? 'local' : (mergedTracks.length ? 'synced' : 'idle')
        return savedTracks.value
      })
      .catch((error) => {
        if (activeUserId.value === currentScope && activeToken.value === currentToken) {
          savedTracks.value = loadLocalSavedTracks(currentScope)
          trackSyncState.value = savedTracks.value.length ? 'local' : 'idle'
        }
        throw error
      })
      .finally(() => {
        if (loadTracksPromise.value === request) {
          loadTracksPromise.value = null
        }
        if (activeUserId.value === currentScope) {
          savedTracksLoading.value = false
        }
      })

    loadTracksPromise.value = request
    return request
  }

  async function startTracking() {
    hydrate()
    ensureLocationListener()

    try {
      await startLocationUpdates()
      const now = Date.now()
      if (!trackingStartedAt.value) {
        trackingStartedAt.value = now
      }
      trackingActiveFrom.value = now
      currentSegmentIndex.value = trackPoints.value.length ? resolveNextSegmentIndex(trackPoints.value) : 0
      isTracking.value = true
      locationError.value = ''
      persistSession()
      startTrackingPoll()

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
    hydrate()
    if (!isTracking.value) {
      return
    }

    accumulatedDurationMs.value = getElapsedTrackingDuration()
    trackingActiveFrom.value = 0
    isTracking.value = false
    stopTrackingPoll()
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

    const requestOptions = {
      highAccuracy: true,
      allowGpsOffline: true,
      coordsType: 'wgs84',
      providers: ['gcj02', 'system', 'network', 'wgs84', 'gps'],
      gpsTimeout: 18000,
      gpsMaximumAgeMs: 3000,
      networkTimeout: 6000,
      networkMaximumAgeMs: 2000,
      ...options,
    }

    console.log('[hiking-track] refreshLocation start', {
      isTracking: isTracking.value,
      appendWhenTracking: Boolean(options.appendWhenTracking),
      requestOptions,
    })

    const location = normalizeTrackLocation(await getCurrentLocation(requestOptions))

    if (!location) {
      console.error('[hiking-track] refreshLocation invalid result')
      throw new Error('定位结果无效')
    }

    console.log('[hiking-track] refreshLocation resolved', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      provider: location.provider,
      source: location.source,
      coordinateSystem: location.coordinateSystem,
    })

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

    locationError.value = ''

    normalized.segmentIndex = Number.isFinite(Number(normalized.segmentIndex))
      ? Number(normalized.segmentIndex)
      : Number(currentSegmentIndex.value || 0)

    const lastPoint = trackPoints.value[trackPoints.value.length - 1]
    if (shouldSkipTrackPoint(normalized, lastPoint)) {
      console.log('[hiking-track] skip point', {
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        accuracy: normalized.accuracy,
        provider: normalized.provider,
        source: normalized.source,
      })
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
    console.log('[hiking-track] append point', {
      pointCount: trackPoints.value.length,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      accuracy: normalized.accuracy,
      provider: normalized.provider,
      source: normalized.source,
      segmentIndex: normalized.segmentIndex,
    })
    persistSession()
  }

  async function finishTracking() {
    hydrate()

    const durationMs = getElapsedTrackingDuration()
    const payload = createSavedTrack(trackPoints.value, { durationMs })
    if (!payload) {
      throw new Error('当前轨迹太短，至少记录两个有效点后再结束')
    }

    if (isTracking.value) {
      await stopTracking()
    }

    if (!activeToken.value || activeUserId.value === 'guest') {
      const localTrack = normalizeSavedTrack({
        id: `local-${payload.capturedAt}`,
        ...payload,
      })
      if (!localTrack) {
        throw new Error('轨迹保存失败，请稍后再试')
      }

      savedTracks.value = [localTrack, ...savedTracks.value.filter((item) => item.id !== localTrack.id)]
      upsertSavedHikingTrack(getSessionScope(), localTrack)
      trackSyncState.value = 'local'
      resetActiveTrackState()
      return localTrack
    }

    let savedTrack = null

    try {
      const createdTrack = await createMyHikingTrack({ title: payload.title, ...payload }, activeToken.value)
      savedTrack = normalizeSavedTrack(createdTrack)
    } catch (error) {
      savedTrack = normalizeSavedTrack({
        id: `local-${payload.capturedAt}`,
        ...payload,
      })
      if (!savedTrack) {
        throw error
      }
    }

    if (!savedTrack) {
      throw new Error('轨迹保存失败，请稍后再试')
    }

    savedTracks.value = [savedTrack, ...savedTracks.value.filter((item) => item.id !== savedTrack.id)]
    upsertSavedHikingTrack(getSessionScope(), savedTrack)
    trackSyncState.value = isLocalTrackId(savedTrack.id) ? 'local' : 'synced'
    resetActiveTrackState()
    return savedTrack
  }

  async function clearCurrentTrack() {
    hydrate()

    if (isTracking.value) {
      await stopTracking()
    }

    resetActiveTrackState()
  }

  async function clearSavedTrack(trackId) {
    hydrate()

    if (!activeToken.value || activeUserId.value === 'guest') {
      savedTracks.value = savedTracks.value.filter((item) => item.id !== trackId)
      removeSavedHikingTrack(getSessionScope(), trackId)
      trackSyncState.value = pendingSyncCount.value ? 'local' : (savedTracks.value.length ? 'saved' : 'idle')
      persistSession()
      return
    }

    if (!String(trackId || '').startsWith('local-')) {
      await deleteMyHikingTrack(trackId, activeToken.value)
    }
    savedTracks.value = savedTracks.value.filter((item) => item.id !== trackId)
    removeSavedHikingTrack(getSessionScope(), trackId)
    trackSyncState.value = savedTracks.value.some((item) => isLocalTrackId(item?.id)) ? 'local' : (savedTracks.value.length ? 'synced' : 'idle')
    persistSession()
  }

  async function renameSavedTrack(trackId, nextTitle) {
    hydrate()

    const normalizedTrackId = String(trackId || '').trim()
    const normalizedTitle = String(nextTitle || '').trim()

    if (!normalizedTrackId) {
      throw new Error('轨迹不存在，无法修改名称')
    }

    if (!normalizedTitle) {
      throw new Error('轨迹名称不能为空')
    }

    const currentTrack = savedTracks.value.find((item) => String(item?.id || '') === normalizedTrackId)
    if (!currentTrack) {
      throw new Error('轨迹不存在，无法修改名称')
    }

    const applyRenamedTrack = (track, targetTrackId = normalizedTrackId) => {
      const normalized = normalizeSavedTrack({
        ...track,
        title: normalizedTitle,
      })

      if (!normalized) {
        throw new Error('轨迹名称更新失败，请稍后再试')
      }

      savedTracks.value = savedTracks.value.map((item) => (item.id === targetTrackId ? normalized : item))
      const nextLocalTracks = updateSavedHikingTrack(getSessionScope(), targetTrackId, normalized)
      savedTracks.value = mergeSavedTracks(savedTracks.value, nextLocalTracks)
      persistSavedTracks(getSessionScope())
      trackSyncState.value = savedTracks.value.some((item) => isLocalTrackId(item?.id))
        ? 'local'
        : (savedTracks.value.length ? (activeToken.value && activeUserId.value !== 'guest' ? 'synced' : 'saved') : 'idle')
      persistSession()
      return normalized
    }

    if (!activeToken.value || activeUserId.value === 'guest' || isLocalTrackId(normalizedTrackId) || !hasHikingTrackApi()) {
      return applyRenamedTrack(currentTrack)
    }

    try {
      const updatedTrack = await updateMyHikingTrack(normalizedTrackId, { title: normalizedTitle }, activeToken.value)
      return applyRenamedTrack(updatedTrack || currentTrack)
    } catch (error) {
      const shouldFallbackToRecreate = Number(error?.statusCode || 0) === 404
        || String(error?.message || '').includes('接口不存在')
        || String(error?.message || '').includes('徒步轨迹不存在')

      if (!shouldFallbackToRecreate) {
        throw error
      }

      const recreatedTrack = await createMyHikingTrack({
        title: normalizedTitle,
        points: currentTrack.points,
        pointCount: currentTrack.pointCount,
        segmentCount: currentTrack.segmentCount,
        distanceKm: currentTrack.distanceKm,
        durationMs: currentTrack.durationMs,
        altitudeGain: currentTrack.altitudeGain,
        capturedAt: currentTrack.capturedAt,
        startPoint: currentTrack.startPoint,
        endPoint: currentTrack.endPoint,
      }, activeToken.value)

      if (!recreatedTrack) {
        throw error
      }

      if (!String(normalizedTrackId || '').startsWith('local-')) {
        await deleteMyHikingTrack(normalizedTrackId, activeToken.value)
      }

      savedTracks.value = savedTracks.value.map((item) => (item.id === normalizedTrackId ? normalizeSavedTrack(recreatedTrack) : item))
      removeSavedHikingTrack(getSessionScope(), normalizedTrackId)
      upsertSavedHikingTrack(getSessionScope(), normalizeSavedTrack(recreatedTrack))
      return applyRenamedTrack(recreatedTrack, normalizedTrackId)
    }
  }

  function createSavedTrack(points, extras = {}) {
    const payload = createGuideTrackPayload(points, extras)
    if (!payload) {
      return null
    }

    return {
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

  function mergeSavedTracks(primaryTracks = [], secondaryTracks = []) {
    const mergedMap = new Map()
    ;[...primaryTracks, ...secondaryTracks].forEach((item) => {
      const normalized = normalizeSavedTrack(item)
      if (!normalized) {
        return
      }

      const key = normalized.id || `track-${normalized.capturedAt}`
      if (!mergedMap.has(key)) {
        mergedMap.set(key, normalized)
      }
    })

    return Array.from(mergedMap.values()).sort((left, right) => Number(right.capturedAt || 0) - Number(left.capturedAt || 0))
  }

  async function syncPendingLocalTracks(localTracks = [], remoteTracks = [], token = activeToken.value) {
    const remoteTrackSignatures = new Set(remoteTracks.map(buildTrackSignature).filter(Boolean))
    const syncedTracks = []

    for (const item of localTracks) {
      const normalized = normalizeSavedTrack(item)
      if (!normalized) {
        continue
      }

      const signature = buildTrackSignature(normalized)
      if (signature && remoteTrackSignatures.has(signature)) {
        continue
      }

      if (!isLocalTrackId(normalized.id)) {
        syncedTracks.push(normalized)
        if (signature) {
          remoteTrackSignatures.add(signature)
        }
        continue
      }

      try {
        const createdTrack = await createMyHikingTrack({
          title: normalized.title,
          points: normalized.points,
          pointCount: normalized.pointCount,
          segmentCount: normalized.segmentCount,
          distanceKm: normalized.distanceKm,
          durationMs: normalized.durationMs,
          altitudeGain: normalized.altitudeGain,
          capturedAt: normalized.capturedAt,
          startPoint: normalized.startPoint,
          endPoint: normalized.endPoint,
        }, token)
        const uploadedTrack = normalizeSavedTrack(createdTrack)
        if (uploadedTrack) {
          syncedTracks.push(uploadedTrack)
          const uploadedSignature = buildTrackSignature(uploadedTrack)
          if (uploadedSignature) {
            remoteTrackSignatures.add(uploadedSignature)
          }
          continue
        }
      } catch (error) {
        // Keep local track for later retry.
      }

      syncedTracks.push(normalized)
    }

    return syncedTracks
  }

  function buildTrackSignature(track) {
    const normalized = normalizeSavedTrack(track)
    if (!normalized) {
      return ''
    }

    const startPoint = normalized.startPoint || normalized.points?.[0]
    const endPoint = normalized.endPoint || normalized.points?.[normalized.points.length - 1]
    return [
      Number(normalized.capturedAt || 0),
      Number(normalized.pointCount || normalized.points?.length || 0),
      Number(normalized.distanceKm || 0).toFixed(4),
      Number(startPoint?.latitude || 0).toFixed(5),
      Number(startPoint?.longitude || 0).toFixed(5),
      Number(endPoint?.latitude || 0).toFixed(5),
      Number(endPoint?.longitude || 0).toFixed(5),
    ].join('|')
  }

  function isLocalTrackId(trackId) {
    return String(trackId || '').startsWith('local-')
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

    if (accuracy <= 10) {
      return false
    }

    if (distanceMeters < MIN_MOVEMENT_METERS && accuracy > 25) {
      return true
    }

    if (distanceMeters > MAX_WALKING_JUMP_METERS && inferredSpeed > MAX_HIKING_SPEED_MPS && accuracy > 35) {
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
      trackingStartedAt: trackingStartedAt.value,
      trackingActiveFrom: trackingActiveFrom.value,
      accumulatedDurationMs: accumulatedDurationMs.value,
      currentSegmentIndex: currentSegmentIndex.value,
      updatedAt: Date.now(),
    }, getSessionScope())
  }

  function resetActiveTrackState() {
    stopTrackingPoll()
    trackPoints.value = []
    trackingStartedAt.value = 0
    trackingActiveFrom.value = 0
    accumulatedDurationMs.value = 0
    currentSegmentIndex.value = 0
    locationError.value = ''
    persistSession()
  }

  function getElapsedTrackingDuration() {
    const baseDuration = Math.max(0, Number(accumulatedDurationMs.value || 0))
    if (!isTracking.value || !trackingActiveFrom.value) {
      return baseDuration
    }

    return baseDuration + Math.max(0, Date.now() - Number(trackingActiveFrom.value || 0))
  }

  function startTrackingPoll() {
    stopTrackingPoll()
    trackingPollTimer = setInterval(() => {
      if (!isTracking.value) {
        return
      }

      refreshLocation({ appendWhenTracking: true }).catch((error) => {
        console.warn('[hiking-track] tracking poll refresh failed', error)
      })
    }, 4000)
  }

  function stopTrackingPoll() {
    if (trackingPollTimer) {
      clearInterval(trackingPollTimer)
      trackingPollTimer = null
    }
  }

  function resolveNextSegmentIndex(points = [], fallback = 0) {
    if (!Array.isArray(points) || !points.length) {
      return Math.max(0, Number(fallback || 0))
    }

    const maxSegment = points.reduce((result, item) => {
      const value = Number(item?.segmentIndex)
      return Number.isFinite(value) ? Math.max(result, value) : result
    }, 0)

    return maxSegment + 1
  }

  return {
    isTracking,
    currentLocation,
    trackPoints,
    trackingStartedAt,
    hasTrackInProgress,
    trackDurationMs,
    savedTracks,
    savedTracksLoading,
    trackSyncText,
    trackSyncTone,
    locationError,
    hasMapLocation,
    mapCenter,
    mapPolyline,
    mapMarkers,
    hydrate,
    loadSavedTracks,
    refreshLocation,
    startTracking,
    stopTracking,
    finishTracking,
    clearCurrentTrack,
    clearSavedTrack,
    renameSavedTrack,
  }
})
