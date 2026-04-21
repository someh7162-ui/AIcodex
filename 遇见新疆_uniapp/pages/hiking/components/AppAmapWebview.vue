<template>
  <view ref="hostRef" class="app-amap-host">
    <view class="app-amap-backdrop"></view>
  </view>
</template>

<script setup>
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AMAP_SECURITY_JS_CODE, AMAP_WEB_KEY, hasAmapKey, hasAmapSecurityCode } from '../../../config/amap'

const emit = defineEmits(['refresh', 'recenter'])

const props = defineProps({
  mapCenter: {
    type: Object,
    default: null,
  },
  mapScale: {
    type: Number,
    default: 16,
  },
  mapPolyline: {
    type: Array,
    default: () => [],
  },
  mapMarkers: {
    type: Array,
    default: () => [],
  },
  mapModeKey: {
    type: String,
    default: 'normal',
  },
  overlayActive: {
    type: Boolean,
    default: false,
  },
})

const hostRef = ref(null)
const instance = getCurrentInstance()

let childWebview = null
let childWebviewId = `hiking-amap-${Date.now()}`
const refreshBridgeName = `__HIKING_APP_MAP_REFRESH_${Date.now()}__`
const recenterBridgeName = `__HIKING_APP_MAP_RECENTER_${Date.now()}__`
const refreshEventName = `hiking-map-refresh-${Date.now()}`
const recenterEventName = `hiking-map-recenter-${Date.now()}`
let hostWebviewId = ''
let syncTimer = null
let stateSyncTimer = null
let initRetryTimer = null
let initRetryCount = 0
let hasSyncedAfterLoad = false
let lastSyncedSnapshot = null
const MAX_INIT_RETRIES = 12

const handleRefreshBridge = () => {
  emit('refresh')
}

const handleRecenterBridge = () => {
  emit('recenter')
}

onMounted(() => {
  globalThis[refreshBridgeName] = handleRefreshBridge
  globalThis[recenterBridgeName] = handleRecenterBridge
  if (typeof uni !== 'undefined' && typeof uni.$on === 'function') {
    uni.$on(refreshEventName, handleRefreshBridge)
    uni.$on(recenterEventName, handleRecenterBridge)
  }
  if (typeof window !== 'undefined') {
    window[refreshBridgeName] = handleRefreshBridge
    window[recenterBridgeName] = handleRecenterBridge
  }
  initChildWebview().catch(() => {})
})

watch(() => props.mapCenter, () => {
  scheduleStateSync()
}, { deep: true })

watch(() => props.mapScale, () => {
  scheduleStateSync()
})

watch(() => props.mapPolyline, () => {
  scheduleStateSync()
}, { deep: true })

watch(() => props.mapMarkers, () => {
  scheduleStateSync()
}, { deep: true })

watch(() => props.mapModeKey, () => {
  scheduleStateSync()
})

watch(() => props.overlayActive, (value) => {
  syncChildVisibility(value)
})

onBeforeUnmount(() => {
  if (typeof uni !== 'undefined' && typeof uni.$off === 'function') {
    uni.$off(refreshEventName, handleRefreshBridge)
    uni.$off(recenterEventName, handleRecenterBridge)
  }
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  if (stateSyncTimer) {
    clearTimeout(stateSyncTimer)
    stateSyncTimer = null
  }
  if (initRetryTimer) {
    clearTimeout(initRetryTimer)
    initRetryTimer = null
  }
  if (childWebview) {
    try {
      childWebview.close('none')
    } catch (error) {
      // ignore
    }
    childWebview = null
  }
  try {
    delete globalThis[refreshBridgeName]
  } catch (error) {
    globalThis[refreshBridgeName] = undefined
  }
  try {
    delete globalThis[recenterBridgeName]
  } catch (error) {
    globalThis[recenterBridgeName] = undefined
  }
  if (typeof window !== 'undefined') {
    try {
      delete window[refreshBridgeName]
    } catch (error) {
      window[refreshBridgeName] = undefined
    }
    try {
      delete window[recenterBridgeName]
    } catch (error) {
      window[recenterBridgeName] = undefined
    }
  }
})

async function initChildWebview() {
  if (typeof plus === 'undefined' || !plus.webview) {
    return
  }

  await nextTick()

  const rect = await getRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    scheduleInitRetry(rect)
    return
  }

  initRetryCount = 0
  hasSyncedAfterLoad = false
  lastSyncedSnapshot = null

  const current = resolveHostWebview()
  if (!current) {
    throw new Error('host webview unavailable')
  }
  hostWebviewId = String(current.id || '')
  const url = resolveLocalMapUrl()
  childWebview = plus.webview.create(url, childWebviewId, {
    position: 'absolute',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: 'transparent',
    bounce: 'none',
    scalable: false,
    cachemode: 'noCache',
  })

  childWebview.addEventListener('loaded', () => {
    hasSyncedAfterLoad = true
    updateBounds().finally(() => {
      syncMapState({ forceFull: true })
    })
  })
  childWebview.addEventListener('rendered', () => {
    if (!hasSyncedAfterLoad) {
      hasSyncedAfterLoad = true
      updateBounds().finally(() => {
        syncMapState({ forceFull: true })
      })
    }
  })
  current.append(childWebview)
  syncChildVisibility(props.overlayActive)
  syncTimer = setTimeout(() => {
    updateBounds().finally(() => {
      syncMapState({ forceFull: true })
    })
  }, 600)
}

function resolveLocalMapUrl() {
  const query = []
  if (hasAmapKey()) {
    query.push(`key=${encodeURIComponent(AMAP_WEB_KEY)}`)
  }
  if (hasAmapSecurityCode()) {
    query.push(`securityJsCode=${encodeURIComponent(AMAP_SECURITY_JS_CODE)}`)
  }
  if (hostWebviewId) {
    query.push(`hostWebviewId=${encodeURIComponent(hostWebviewId)}`)
  }
  query.push(`refreshBridge=${encodeURIComponent(refreshBridgeName)}`)
  query.push(`recenterBridge=${encodeURIComponent(recenterBridgeName)}`)
  query.push(`refreshEvent=${encodeURIComponent(refreshEventName)}`)
  query.push(`recenterEvent=${encodeURIComponent(recenterEventName)}`)
  query.push(`mode=${encodeURIComponent(String(props.mapModeKey || 'normal'))}`)
  const suffix = query.length ? `?${query.join('&')}` : ''
  return `_www/static/hiking-amap.html${suffix}`
}

function scheduleInitRetry(rect) {
  if (childWebview) {
    return
  }

  if (initRetryCount >= MAX_INIT_RETRIES) {
    return
  }

  initRetryCount += 1
  const delay = initRetryCount <= 3 ? 180 : 300
  if (initRetryTimer) {
    clearTimeout(initRetryTimer)
  }
  initRetryTimer = setTimeout(() => {
    initRetryTimer = null
    initChildWebview().catch(() => {})
  }, delay)
}

function resolveHostWebview() {
  if (typeof plus === 'undefined' || !plus.webview) {
    return null
  }

  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const page = Array.isArray(pages) && pages.length ? pages[pages.length - 1] : null
  const pageWebview = page && typeof page.$getAppWebview === 'function' ? page.$getAppWebview() : null
  if (pageWebview) {
    return pageWebview
  }

  return plus.webview.currentWebview() || null
}

function syncChildVisibility(hidden) {
  if (!childWebview) {
    return
  }

  try {
    if (hidden) {
      childWebview.hide('none')
      return
    }
    childWebview.show('none')
  } catch (error) {}
}

async function updateBounds() {
  if (!childWebview) {
    return
  }

  const rect = await getRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return
  }

  childWebview.setStyle({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
}

function getRect() {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery()
    query.in(getCurrentInstanceProxy())
    query.select('.app-amap-host').boundingClientRect((rect) => {
      resolve(rect || null)
    }).exec()
  })
}

function getCurrentInstanceProxy() {
  return instance?.proxy || null
}

function syncMapState(options = {}) {
  syncMapStateInternal({ forceFull: Boolean(options.forceFull) })
}

function scheduleStateSync() {
  if (stateSyncTimer) {
    clearTimeout(stateSyncTimer)
  }

  stateSyncTimer = setTimeout(() => {
    stateSyncTimer = null
    syncMapStateInternal({ forceFull: false })
  }, 16)
}

function syncMapStateInternal(options = {}) {
  if (!childWebview) {
    if (!initRetryTimer && initRetryCount < MAX_INIT_RETRIES) {
      scheduleInitRetry({ reason: 'sync-without-webview' })
    }
    return
  }

  const state = {
    longitude: Number(props.mapCenter?.longitude || 0),
    latitude: Number(props.mapCenter?.latitude || 0),
    zoom: Math.max(8, Math.min(18, Math.round(Number(props.mapScale || 16)))),
    mode: String(props.mapModeKey || 'normal'),
    markers: extractMarkerPoints(props.mapMarkers),
    track: extractTrackSegments(props.mapPolyline),
  }

  console.log('[hiking-map-sync] sync state', {
    zoom: state.zoom,
    mode: state.mode,
    markerCount: state.markers.length,
    segmentCount: state.track.length,
    pointCount: state.track.reduce((total, segment) => total + segment.length, 0),
    longitude: state.longitude,
    latitude: state.latitude,
  })

  const nextSnapshot = buildSnapshot(state)

  if (options.forceFull || !lastSyncedSnapshot) {
    runChildCommand('initMapState', state)
    lastSyncedSnapshot = nextSnapshot
    return
  }

  const previous = lastSyncedSnapshot
  const trackSignatureChanged = previous.trackSignature !== nextSnapshot.trackSignature
  const modeChanged = state.mode !== previous.mode
  const zoomChanged = state.zoom !== previous.zoom

  if (modeChanged) {
    runChildCommand('initMapState', state)
    lastSyncedSnapshot = nextSnapshot
    return
  }

  if (trackSignatureChanged) {
    runChildCommand('replaceTrack', state.track)
  }

  if (zoomChanged || shouldUpdateViewport(previous, state)) {
    runChildCommand('updateViewport', {
      longitude: state.longitude,
      latitude: state.latitude,
      zoom: state.zoom,
      mode: state.mode,
      markers: state.markers,
    })
  }

  lastSyncedSnapshot = nextSnapshot
}

function buildSnapshot(state) {
  const lastTrackSegment = Array.isArray(state.track[state.track.length - 1]) ? state.track[state.track.length - 1] : []
  const lastTrackPoint = lastTrackSegment[lastTrackSegment.length - 1] || null
  const firstMarker = state.markers[0] || null
  const trackPointCount = state.track.reduce((total, segment) => total + (Array.isArray(segment) ? segment.length : 0), 0)

  return {
    longitude: state.longitude,
    latitude: state.latitude,
    zoom: state.zoom,
    mode: state.mode,
    trackLength: state.track.length,
    trackPointCount,
    lastTrackLongitude: Number(lastTrackPoint?.longitude || 0),
    lastTrackLatitude: Number(lastTrackPoint?.latitude || 0),
    trackSignature: JSON.stringify(state.track),
    markerSignature: JSON.stringify(firstMarker || null),
  }
}

function shouldUpdateViewport(previous, state) {
  if (Math.abs(previous.longitude - state.longitude) > 0.000001) {
    return true
  }
  if (Math.abs(previous.latitude - state.latitude) > 0.000001) {
    return true
  }
  return previous.markerSignature !== JSON.stringify(state.markers[0] || null)
}

function runChildCommand(name, payload) {
  if (!childWebview) {
    return
  }

  try {
    childWebview.evalJS(`window.${name} && window.${name}(${JSON.stringify(payload)})`)
  } catch (error) {}
}

function extractTrackSegments(polyline) {
  if (!Array.isArray(polyline)) {
    return []
  }

  return polyline
    .map((line) => {
      const points = Array.isArray(line?.points) ? line.points : []
      return points
        .map((item) => ({
          longitude: Number(item.longitude),
          latitude: Number(item.latitude),
        }))
        .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude))
    })
    .filter((segment) => segment.length)
}

function extractMarkerPoints(markers) {
  return Array.isArray(markers)
    ? markers
      .map((item) => ({
        longitude: Number(item.longitude),
        latitude: Number(item.latitude),
        label: item?.callout?.content || '',
        avatarUrl: String(item?.avatarUrl || ''),
        avatarInitial: String(item?.avatarInitial || '游').slice(0, 1) || '游',
        statusText: String(item?.statusText || item?.callout?.content || '当前位置'),
      }))
      .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude))
    : []
}
</script>

<style scoped lang="scss">
.app-amap-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.app-amap-backdrop {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #071018 0%, #050607 100%);
}
</style>
