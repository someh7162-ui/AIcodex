<template>
  <view ref="hostRef" class="app-amap-host">
    <view class="app-amap-backdrop"></view>
  </view>
</template>

<script setup>
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
})

const hostRef = ref(null)
const instance = getCurrentInstance()

let childWebview = null
let childWebviewId = `hiking-amap-${Date.now()}`
let syncTimer = null
let initRetryTimer = null
let initRetryCount = 0
const MAX_INIT_RETRIES = 12

function logAppMap(message, extra) {
  if (extra !== undefined) {
    console.log('[hiking-app-map]', message, extra)
    return
  }
  console.log('[hiking-app-map]', message)
}

onMounted(() => {
  logAppMap('component mounted')
  initChildWebview().catch(() => {})
})

watch(() => props.mapCenter, () => {
  syncMapState()
}, { deep: true })

watch(() => props.mapScale, () => {
  syncMapState()
})

watch(() => props.mapPolyline, () => {
  syncMapState()
}, { deep: true })

onBeforeUnmount(() => {
  logAppMap('component before unmount')
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
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
})

async function initChildWebview() {
  if (typeof plus === 'undefined' || !plus.webview) {
    logAppMap('plus.webview unavailable')
    return
  }

  await nextTick()

  const rect = await getRect()
  logAppMap('init rect', rect)
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    scheduleInitRetry(rect)
    return
  }

  initRetryCount = 0

  const current = plus.webview.currentWebview()
  const url = resolveLocalMapUrl()
  logAppMap('creating child webview', { id: childWebviewId, url })
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
    logAppMap('child webview loaded')
  })
  childWebview.addEventListener('loading', () => {
    logAppMap('child webview loading')
  })
  childWebview.addEventListener('rendering', () => {
    logAppMap('child webview rendering')
  })
  childWebview.addEventListener('rendered', () => {
    logAppMap('child webview rendered')
  })
  childWebview.addEventListener('error', (event) => {
    logAppMap('child webview error', event)
  })

  current.append(childWebview)
  childWebview.show('none')
  logAppMap('child webview appended and shown')
  syncTimer = setTimeout(() => {
    updateBounds().finally(() => {
      syncMapState()
    })
  }, 600)
}

function resolveLocalMapUrl() {
  if (typeof plus === 'undefined' || !plus.io || typeof plus.io.convertLocalFileSystemURL !== 'function') {
    logAppMap('convertLocalFileSystemURL unavailable, fallback raw path')
    return '_www/static/hiking-amap.html'
  }

  const absolutePath = plus.io.convertLocalFileSystemURL('_www/static/hiking-amap.html')
  logAppMap('resolved local map path', absolutePath)
  return absolutePath || '_www/static/hiking-amap.html'
}

function scheduleInitRetry(rect) {
  if (childWebview) {
    return
  }

  if (initRetryCount >= MAX_INIT_RETRIES) {
    logAppMap('invalid rect, max retries reached', rect)
    return
  }

  initRetryCount += 1
  const delay = initRetryCount <= 3 ? 180 : 300
  logAppMap(`invalid rect, retry ${initRetryCount}/${MAX_INIT_RETRIES}`, rect)
  if (initRetryTimer) {
    clearTimeout(initRetryTimer)
  }
  initRetryTimer = setTimeout(() => {
    initRetryTimer = null
    initChildWebview().catch((error) => {
      logAppMap('retry init failed', error?.message || error)
    })
  }, delay)
}

async function updateBounds() {
  if (!childWebview) {
    return
  }

  const rect = await getRect()
  logAppMap('updateBounds rect', rect)
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    logAppMap('updateBounds skipped because rect invalid')
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

function syncMapState() {
  if (!childWebview) {
    logAppMap('syncMapState skipped, child webview missing')
    if (!initRetryTimer && initRetryCount < MAX_INIT_RETRIES) {
      scheduleInitRetry({ reason: 'sync-without-webview' })
    }
    return
  }

  const state = {
    longitude: Number(props.mapCenter?.longitude || 0),
    latitude: Number(props.mapCenter?.latitude || 0),
    zoom: Math.max(8, Math.min(18, Math.round(Number(props.mapScale || 16)))),
    track: extractTrackPoints(props.mapPolyline),
  }

  logAppMap('syncMapState payload', state)
  childWebview.evalJS(`window.updateMapState && window.updateMapState(${JSON.stringify(state)})`)
}

function extractTrackPoints(polyline) {
  const line = Array.isArray(polyline) ? polyline[0] : null
  const points = Array.isArray(line?.points) ? line.points : []
  return points
    .map((item) => ({
      longitude: Number(item.longitude),
      latitude: Number(item.latitude),
    }))
    .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude))
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
