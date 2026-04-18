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
      :map-scale="mapScale"
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
      :emergency-contact-name="emergencyContactName"
      :emergency-contact-phones="emergencyContactPhones"
      @sos-message="handleEmergencySms"
      @toggle-track="handleStart"
      @toggle-guard="toggleGuard"
    />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import HikingHeaderPanel from './components/HikingHeaderPanel.vue'
import HikingMapStage from './components/HikingMapStage.vue'
import HikingBottomControls from './components/HikingBottomControls.vue'
import { hikingModeMock } from '../../common/hiking-mode'
import {
  formatCoordinate,
  formatMetric,
  sumTrackDistanceKm,
} from '../../common/hiking-metrics'
import { openAppPermissionSettings } from '../../services/amap'
import { useHikingStore } from '../../stores/useHikingStore'

const MAP_MODES = [
  { key: 'satellite', label: '高德卫星图' },
]

const hikingStore = useHikingStore()
const {
  isTracking,
  currentLocation,
  trackPoints,
  locationError,
} = storeToRefs(hikingStore)

const isGuardMode = ref(false)
const mapScale = ref(15)
const currentMapMode = ref(MAP_MODES[0].key)
const networkOnline = ref(true)
const debugLogs = ref([])
let hasPromptedLocationSettings = false
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
  if (currentLocation.value) {
    const provider = String(currentLocation.value.provider || '').toLowerCase()
    if (provider === 'gps') {
      return isTracking.value ? 'GPS 记录中' : 'GPS 已连接'
    }
    if (provider === 'network') {
      return isTracking.value ? '网络定位记录中' : '网络定位已连接'
    }
    return isTracking.value ? '定位记录中' : '定位已连接'
  }
  return locationError.value || 'GPS 连接中'
})

const altitudeText = computed(() => formatMetric(currentLocation.value?.altitude, 0))
const accuracyText = computed(() => formatMetric(currentLocation.value?.accuracy, 0))
const isOffline = computed(() => !networkOnline.value)
const distanceText = computed(() => sumTrackDistanceKm(trackPoints.value).toFixed(2))
const mapModeLabel = computed(() => MAP_MODES.find((item) => item.key === currentMapMode.value)?.label || '标准地图')
const headerModeText = computed(() => `${isOffline.value ? '离线' : '在线'} · ${mapModeLabel.value}`)
const debugText = computed(() => debugLogs.value.join(' | '))
const emergencyContactName = computed(() => hikingModeMock.emergency?.primaryName || '紧急联系人')
const emergencyContactPhones = computed(() => {
  const emergency = hikingModeMock.emergency || {}
  return [emergency.primaryPhone, emergency.backupPhone].filter(Boolean)
})
const offlineHint = computed(() => {
  if (isOffline.value) {
    return '离线时仍可继续使用 GPS 定位，但高德卫星图需要联网加载。'
  }

  return '当前使用高德卫星图显示徒步位置与轨迹。'
})

onLoad(async () => {
  hikingStore.hydrate()
  bindNetworkState()
  if (!currentLocation.value) {
    await refreshLocation()
  }
})

onUnload(() => {
  cleanup()
})

onBeforeUnmount(() => {
  cleanup()
})

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

async function refreshLocation() {
  try {
    appendDebugLog(`开始定位: offline=${isOffline.value ? '1' : '0'}, tracking=${isTracking.value ? '1' : '0'}`)
    const location = await hikingStore.refreshLocation({
      preferGpsWhenOffline: isOffline.value,
      appendWhenTracking: isTracking.value,
    })
    appendDebugLog(`定位返回: ${formatLocationDebug(location)}`)
  } catch (error) {
    locationError.value = error?.message || '定位失败'
    appendDebugLog(`定位失败: ${locationError.value}`)
    maybePromptLocationSettings(locationError.value)
  }
}

async function handleStart() {
  try {
    if (isTracking.value) {
      await hikingStore.stopTracking()
      uni.showToast({
        title: '暂停追踪',
        icon: 'none',
      })
    } else {
      await hikingStore.startTracking()
      await refreshLocation()
      uni.showToast({
        title: '开始追踪',
        icon: 'none',
      })
    }
  } catch (error) {
    uni.showToast({
      title: error?.message || '追踪切换失败',
      icon: 'none',
      duration: 2500,
    })
  }
}

async function recenterMap() {
  mapScale.value = 16
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
  uni.showToast({
    title: '当前固定为高德卫星图',
    icon: 'none',
  })
}

function handleEmergencySms() {
  const phones = emergencyContactPhones.value
  if (!phones.length) {
    uni.showToast({
      title: '未配置紧急联系人',
      icon: 'none',
    })
    return
  }

  if (!currentLocation.value) {
    uni.showToast({
      title: '请先等待定位成功',
      icon: 'none',
    })
    return
  }

  const body = buildEmergencySmsBody(currentLocation.value)

  // #ifdef APP-PLUS
  try {
    if (typeof plus === 'undefined' || !plus.android || plus.os?.name !== 'Android') {
      throw new Error('仅支持 Android 紧急短信')
    }

    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const intent = new Intent(Intent.ACTION_SENDTO)
    intent.setData(Uri.parse(`smsto:${phones.join(';')}`))
    intent.putExtra('sms_body', body)
    main.startActivity(intent)
    uni.showToast({
      title: '已打开短信发送界面',
      icon: 'none',
    })
    return
  } catch (error) {
    uni.showModal({
      title: '无法直接打开短信',
      content: body,
      confirmText: '知道了',
      showCancel: false,
    })
    return
  }
  // #endif

  uni.showModal({
    title: '紧急短信内容',
    content: body,
    confirmText: '知道了',
    showCancel: false,
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
}

function appendDebugLog(message) {
  const stamp = new Date().toTimeString().slice(0, 8)
  debugLogs.value = [`${stamp} ${message}`, ...debugLogs.value].slice(0, 4)
}

function maybePromptLocationSettings(message) {
  if (hasPromptedLocationSettings || !/定位权限未开启/.test(String(message || ''))) {
    return
  }

  hasPromptedLocationSettings = true
  uni.showModal({
    title: '需要定位权限',
    content: '徒步页面需要定位权限才能记录轨迹。是否现在前往系统设置开启？',
    confirmText: '去开启',
    cancelText: '稍后',
    success: ({ confirm }) => {
      if (confirm && !openAppPermissionSettings()) {
        uni.showToast({
          title: '请在系统设置中手动开启定位权限',
          icon: 'none',
          duration: 2500,
        })
      }
    },
  })
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

  const accuracy = Number(location.accuracy || 0)
  const altitude = Number(location.altitude || 0)
  const parts = [
    provider,
    `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
    `acc=${Number.isFinite(accuracy) ? accuracy.toFixed(0) : '--'}`,
  ]

  if (Number.isFinite(altitude) && altitude > 0) {
    parts.push(`alt=${altitude.toFixed(0)}`)
  }

  if (location.coordinateSystem) {
    parts.push(String(location.coordinateSystem))
  }

  return parts.join(' ')
}

function buildEmergencySmsBody(location) {
  const latitude = Number(location?.latitude)
  const longitude = Number(location?.longitude)
  const altitude = Number(location?.altitude)
  const accuracy = Number(location?.accuracy)
  const provider = location?.provider || 'unknown'
  const coordText = `${formatCoordinate(latitude, 'lat')}, ${formatCoordinate(longitude, 'lng')}`
  const altitudeValue = Number.isFinite(altitude) && altitude > 0 ? `${Math.round(altitude)}m` : '未知'
  const accuracyValue = Number.isFinite(accuracy) && accuracy > 0 ? `${Math.round(accuracy)}m` : '未知'
  const emergencyText = hikingModeMock.emergency?.smsText || '我正在徒步中，可能遇到危险，请尽快联系我。'

  return [
    '【云起天山 徒步 SOS】',
    emergencyText,
    `坐标：${coordText}`,
    `海拔：${altitudeValue}`,
    `精度：${accuracyValue}`,
    `定位来源：${provider}`,
    `高德链接：https://uri.amap.com/marker?position=${longitude},${latitude}&name=SOS位置`,
  ].join('\n')
}
</script>

<style scoped lang="scss">
.container {
  height: 100vh;
  min-height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.status-bar {
  height: var(--status-bar-height);
}
</style>
