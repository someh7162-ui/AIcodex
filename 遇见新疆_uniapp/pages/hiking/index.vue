<template>
  <view class="container">
    <view class="status-bar"></view>

    <HikingHeaderPanel
      :gps-status-text="gpsStatusText"
      :coordinate-text="coordinateText"
      :altitude-text="altitudeText"
      :distance-text="distanceText"
      :accuracy-text="accuracyText"
      :is-offline="isOffline"
      :mode-text="headerModeText"
      :debug-text="debugText"
    />

    <HikingMapStage
      :has-map-location="hasMapLocation"
      :map-center="mapCenter"
      :map-scale="mapScale"
      :map-polyline="mapPolyline"
      :map-markers="mapMarkers"
      :is-tracking="isTracking"
      :map-mode-label="mapModeLabel"
      :map-mode-key="currentMapMode"
      :is-offline="isOffline"
      :offline-hint="offlineHint"
      @refresh="refreshLocation"
      @recenter="recenterMap"
      @toggle-track="handleStart"
      @cycle-map-mode="cycleMapMode"
    />

    <HikingBottomControls
      :is-tracking="isTracking"
      :is-guard-mode="isGuardMode"
      @sos="handleSOS"
      @toggle-track="handleStart"
      @toggle-guard="toggleGuard"
    />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import HikingHeaderPanel from './components/HikingHeaderPanel.vue'
import HikingMapStage from './components/HikingMapStage.vue'
import HikingBottomControls from './components/HikingBottomControls.vue'
import { getHikingSession, updateHikingSessionLocation } from '../../common/hiking-session'
import {
  buildCurrentMarker,
  buildTrackPolyline,
  formatCoordinate,
  formatMetric,
  normalizeLocation,
  sumTrackDistanceKm,
} from '../../common/hiking-metrics'
import { createHikingNativeBridge, DEFAULT_MAP_PROVIDER } from '../../services/hiking-native'

const TRACKING_INTERVAL = 8000
const MAP_MODES = [
  { key: 'normal', label: '标准地图' },
  { key: 'satellite', label: '卫星视图' },
  { key: 'terrain', label: '等高线地形' },
]

const bridge = createHikingNativeBridge()

const isTracking = ref(false)
const isGuardMode = ref(false)
const mapScale = ref(15)
const currentLocation = ref(null)
const trackPoints = ref([])
const locationError = ref('')
const currentMapMode = ref(MAP_MODES[0].key)
const networkOnline = ref(true)
const nativeTrackSummary = ref(null)
const offlineMapStatus = ref(null)
const debugLogs = ref([])
let pollTimer = null
let stopStandardEvents = null

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
const coordinateText = computed(() => {
  if (!currentLocation.value) {
    return locationError.value || '等待定位'
  }

  return `${formatCoordinate(currentLocation.value.latitude, 'lat')}, ${formatCoordinate(currentLocation.value.longitude, 'lng')}`
})

const gpsStatusText = computed(() => {
  if (isOffline.value && currentLocation.value) {
    return isTracking.value ? '离线 GPS 记录中' : '离线 GPS 可用'
  }
  if (bridge.isNativeAvailable()) {
    return isTracking.value ? '原生徒步地图记录中' : '原生徒步地图已就绪'
  }
  if (currentLocation.value) {
    return isTracking.value ? 'GPS 记录中' : 'GPS 已连接'
  }
  return locationError.value || 'GPS 连接中'
})

const altitudeText = computed(() => formatMetric(currentLocation.value?.altitude, 0))
const accuracyText = computed(() => formatMetric(currentLocation.value?.accuracy, 0))
const isOffline = computed(() => !networkOnline.value)
const distanceText = computed(() => {
  const nativeDistance = Number(nativeTrackSummary.value?.distanceKm)
  if (Number.isFinite(nativeDistance) && nativeDistance >= 0) {
    return nativeDistance.toFixed(2)
  }
  return sumTrackDistanceKm(trackPoints.value).toFixed(2)
})
const mapPolyline = computed(() => buildTrackPolyline(trackPoints.value))
const mapMarkers = computed(() => buildCurrentMarker(currentLocation.value, isTracking.value))
const mapModeLabel = computed(() => MAP_MODES.find((item) => item.key === currentMapMode.value)?.label || '标准地图')
const headerModeText = computed(() => `${isOffline.value ? '离线' : '在线'} · ${mapModeLabel.value}`)
const debugText = computed(() => debugLogs.value.join(' | '))
const offlineHint = computed(() => {
  const terrainReady = Boolean(offlineMapStatus.value?.terrainPackReady)
  if (isOffline.value) {
    return currentMapMode.value === 'terrain'
      ? (terrainReady
        ? '无网络时继续使用 GPS 定位与离线等高线地形包，轨迹会保存在本地。'
        : '当前为离线 GPS 模式，但还没有离线等高线包，需尽快预下载。')
      : '无网络时继续使用 GPS 定位，建议切换到等高线地形模式并提前下载离线包。'
  }

  return currentMapMode.value === 'terrain'
    ? (terrainReady
      ? '当前为徒步增强模式，优先显示等高线/地形信息与风险叠加层。'
      : '当前为徒步增强模式，建议先下载离线等高线地形包。')
    : '当前在线地图可正常加载，弱网前建议提前缓存离线地形包。'
})

onLoad(async () => {
  hydrateSession()
  bindNetworkState()
  bindNativeEvents()
  await bridge.initMap({ mode: currentMapMode.value, provider: DEFAULT_MAP_PROVIDER })
  await refreshLocation()
  await refreshTrackSummary()
  await refreshOfflineMapStatus()
})

onUnload(() => {
  cleanup()
})

onBeforeUnmount(() => {
  cleanup()
})

function hydrateSession() {
  const session = getHikingSession()
  if (!session) {
    return
  }

  currentLocation.value = normalizeLocation(session.lastLocation)
  trackPoints.value = Array.isArray(session.points)
    ? session.points.map(normalizeLocation).filter(Boolean)
    : []
}

function bindNetworkState() {
  if (typeof uni.getNetworkType === 'function') {
    uni.getNetworkType({
      success: ({ networkType }) => {
        networkOnline.value = networkType !== 'none'
      },
    })
  }

  if (typeof uni.onNetworkStatusChange === 'function') {
    uni.onNetworkStatusChange(({ isConnected }) => {
      networkOnline.value = Boolean(isConnected)
    })
  }
}

function bindNativeEvents() {
  stopStandardEvents = bridge.subscribeStandardEvents({
    onLocationChange(payload) {
      appendDebugLog(`原生事件定位: ${formatLocationDebug(payload)}`)
      const location = normalizeLocation(payload)
      if (location) {
        currentLocation.value = location
        locationError.value = ''
        if (isTracking.value) {
          persistTrackPoint(location)
        }
      }
    },
    onTrackUpdate(payload) {
      nativeTrackSummary.value = payload || null
    },
    onNativeError(payload) {
      if (payload?.message) {
        locationError.value = payload.message
        appendDebugLog(`原生异常: ${payload.message}`)
      }
    },
  })
}

async function refreshLocation() {
  try {
    appendDebugLog(`开始定位: offline=${isOffline.value ? '1' : '0'}, native=${bridge.isNativeAvailable() ? '1' : '0'}`)
    const rawLocation = await bridge.refreshLocation({
      highAccuracy: true,
      allowGpsOffline: true,
      preferGpsWhenOffline: isOffline.value,
    })
    appendDebugLog(`定位返回: ${formatLocationDebug(rawLocation)}`)
    const location = normalizeLocation(rawLocation)
    if (!location) {
      throw new Error('定位结果无效')
    }

    currentLocation.value = location
    locationError.value = ''

    if (isTracking.value) {
      persistTrackPoint(location)
    }

    await refreshTrackSummary()
  } catch (error) {
    locationError.value = error?.message || '定位失败'
    appendDebugLog(`定位失败: ${locationError.value}`)
  }
}

function persistTrackPoint(location) {
  const session = updateHikingSessionLocation(location)
  trackPoints.value = Array.isArray(session?.points)
    ? session.points.map(normalizeLocation).filter(Boolean)
    : trackPoints.value
}

function startTrackingPoll() {
  stopTrackingPoll()
  pollTimer = setInterval(() => {
    refreshLocation()
  }, TRACKING_INTERVAL)
}

function stopTrackingPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function handleStart() {
  isTracking.value = !isTracking.value

  if (isTracking.value) {
    await bridge.startTrack({
      intervalMs: TRACKING_INTERVAL,
      distanceFilterMeters: 3,
      highAccuracy: true,
      allowGpsOffline: true,
      persistOffline: true,
      provider: DEFAULT_MAP_PROVIDER,
    })
    await refreshLocation()
    startTrackingPoll()
  } else {
    stopTrackingPoll()
    await bridge.stopTrack()
  }

  uni.showToast({
    title: isTracking.value ? '开始追踪' : '暂停追踪',
    icon: 'none',
  })
}

async function recenterMap() {
  mapScale.value = 16
  await bridge.moveToCurrentLocation()
  if (!currentLocation.value) {
    await refreshLocation()
    return
  }

  uni.showToast({
    title: '已回到当前位置',
    icon: 'none',
  })
}

async function cycleMapMode() {
  const currentIndex = MAP_MODES.findIndex((item) => item.key === currentMapMode.value)
  const nextMode = MAP_MODES[(currentIndex + 1) % MAP_MODES.length]
  currentMapMode.value = nextMode.key
  await bridge.setMapMode(nextMode.key, { provider: DEFAULT_MAP_PROVIDER })
  uni.showToast({
    title: nextMode.label,
    icon: 'none',
  })
}

async function refreshTrackSummary() {
  try {
    nativeTrackSummary.value = await bridge.getTrackSummary()
  } catch (error) {
    nativeTrackSummary.value = null
  }
}

async function refreshOfflineMapStatus() {
  try {
    offlineMapStatus.value = await bridge.getOfflineMapStatus()
  } catch (error) {
    offlineMapStatus.value = null
  }
}

function handleSOS() {
  uni.showModal({
    title: '紧急呼救',
    content: '确认要发送 SOS 信号并通知紧急联系人吗？',
    confirmColor: '#FF3B30',
  })
}

function toggleGuard() {
  isGuardMode.value = !isGuardMode.value
  uni.showToast({
    title: isGuardMode.value ? '守护模式已开启' : '守护模式已关闭',
    icon: 'none',
  })
}

function cleanup() {
  stopTrackingPoll()
  if (typeof stopStandardEvents === 'function') {
    stopStandardEvents()
    stopStandardEvents = null
  }
  bridge.destroyMap()
}

function appendDebugLog(message) {
  const stamp = new Date().toTimeString().slice(0, 8)
  debugLogs.value = [`${stamp} ${message}`, ...debugLogs.value].slice(0, 4)
}

function formatLocationDebug(location) {
  if (!location) {
    return 'empty'
  }

  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)
  const provider = location.provider || 'unknown'
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return `${provider} invalid`
  }

  return `${provider} ${latitude.toFixed(5)},${longitude.toFixed(5)} acc=${Number(location.accuracy || 0).toFixed(0)}`
}
</script>

<style scoped lang="scss">
.container {
  min-height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.status-bar {
  height: var(--status-bar-height);
}
</style>
