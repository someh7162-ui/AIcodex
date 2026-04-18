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
      :sunset-countdown-text="sunsetCountdownText"
      :sunset-time-text="sunsetTimeText"
      :sunset-risk-level="sunsetRiskLevel"
      :guard-status-text="guardStatusText"
      :guard-status-level="guardStatusLevel"
    />

    <HikingMapStage
      :map-scale="mapScale"
      :map-mode-key="currentMapMode"
      :is-offline="isOffline"
      :offline-hint="offlineHint"
      @refresh="refreshLocation"
      @recenter="recenterMap"
      @toggle-track="handleStart"
      @zoom-in="zoomInMap"
      @zoom-out="zoomOutMap"
    />

    <HikingBottomControls
      :is-tracking="isTracking"
      :is-guard-mode="isGuardMode"
      :emergency-contact-name="emergencyContactName"
      :emergency-contact-phones="emergencyContactPhones"
      @sos-message="handleEmergencySms"
      @toggle-track="handleStart"
      @finish-track="handleFinishTrack"
      @toggle-guard="toggleGuard"
    />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import HikingHeaderPanel from './components/HikingHeaderPanel.vue'
import HikingMapStage from './components/HikingMapStage.vue'
import HikingBottomControls from './components/HikingBottomControls.vue'
import { evaluateStationaryRisk, formatStationaryStatus } from '../../common/hiking-guard'
import { hikingModeMock } from '../../common/hiking-mode'
import { formatSunsetTime, getSunsetInfo } from '../../common/sun-times'
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
const MIN_MAP_SCALE = 12
const MAX_MAP_SCALE = 18
const RECENTER_MAP_SCALE = 16

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
const nowTick = ref(Date.now())
const lastGuardPromptAt = ref(0)
const guardCooldownUntil = ref(0)
const lastGuardSafeAt = ref(0)
const lastSunsetWarningLevel = ref(0)
const lastSunsetWarningDate = ref('')
let sunsetTimer = null
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
const sunsetInfo = computed(() => getSunsetInfo(currentLocation.value, new Date(nowTick.value)))
const sunsetCountdownText = computed(() => sunsetInfo.value?.countdownText || '')
const sunsetTimeText = computed(() => formatSunsetTime(sunsetInfo.value?.sunsetAt))
const sunsetRiskLevel = computed(() => {
  const minutes = Number(sunsetInfo.value?.minutesToSunset)
  if (!Number.isFinite(minutes)) {
    return 'safe'
  }
  if (minutes <= 0) {
    return 'passed'
  }
  if (minutes <= 60) {
    return 'danger'
  }
  if (minutes <= 120) {
    return 'warning'
  }
  return 'safe'
})
const stationaryRisk = computed(() => evaluateStationaryRisk({
  isGuardMode: isGuardMode.value,
  isTracking: isTracking.value,
  trackPoints: trackPoints.value,
  currentLocation: currentLocation.value,
  now: nowTick.value,
  minutesToSunset: sunsetInfo.value?.minutesToSunset,
  cooldownUntil: guardCooldownUntil.value,
  lastConfirmedAt: lastGuardSafeAt.value,
}))
const guardStatusText = computed(() => {
  if (!isGuardMode.value) {
    return ''
  }
  if (stationaryRisk.value.active) {
    return `${formatStationaryStatus(stationaryRisk.value)}，请确认状态`
  }
  return '守护中'
})
const guardStatusLevel = computed(() => {
  if (!isGuardMode.value) {
    return 'safe'
  }
  if (stationaryRisk.value.level === 'danger') {
    return 'danger'
  }
  if (stationaryRisk.value.level === 'warning') {
    return 'warning'
  }
  return 'safe'
})
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
  startSunsetTimer()
  if (!currentLocation.value) {
    await refreshLocation()
  }
})

watch(
  () => [sunsetInfo.value?.localDateKey || '', sunsetInfo.value?.minutesToSunset ?? null],
  ([dateKey, minutes]) => {
    if (!dateKey) {
      lastSunsetWarningLevel.value = 0
      lastSunsetWarningDate.value = ''
      return
    }

    if (dateKey !== lastSunsetWarningDate.value) {
      lastSunsetWarningDate.value = dateKey
      lastSunsetWarningLevel.value = 0
    }

    const nextLevel = getSunsetWarningLevel(minutes)
    if (!nextLevel || nextLevel <= lastSunsetWarningLevel.value) {
      return
    }

    lastSunsetWarningLevel.value = nextLevel
    showSunsetWarning(nextLevel, minutes)
  },
  { immediate: true }
)

watch(
  () => [stationaryRisk.value.active, stationaryRisk.value.observedMinutes, isGuardMode.value],
  ([active, observedMinutes, guardEnabled]) => {
    if (!guardEnabled || !active) {
      return
    }

    const currentTime = nowTick.value
    if (currentTime - Number(lastGuardPromptAt.value || 0) < 10 * 60000) {
      return
    }

    lastGuardPromptAt.value = currentTime
    uni.showModal({
      title: '守护提醒',
      content: `你已连续停留约 ${observedMinutes} 分钟。若只是休息，请点“我安全”；若感觉不适或迷路，请尽快使用 SOS 求助。`,
      confirmText: '我安全',
      cancelText: '稍后提醒',
      success: ({ confirm }) => {
        if (confirm) {
          acknowledgeGuardSafe(20)
          uni.showToast({
            title: '已继续守护',
            icon: 'none',
          })
          return
        }

        guardCooldownUntil.value = Date.now() + 10 * 60000
      },
      fail: () => {
        guardCooldownUntil.value = Date.now() + 10 * 60000
      },
    })
  }
)

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

async function handleFinishTrack() {
  if (!isTracking.value) {
    return
  }

  uni.showModal({
    title: '结束并保存轨迹',
    content: '长按后将结束本次徒步记录，并把轨迹保存到发布页可选列表。',
    confirmText: '结束保存',
    cancelText: '继续记录',
    success: async ({ confirm }) => {
      if (!confirm) {
        return
      }

      try {
        const savedTrack = await hikingStore.finishTracking()
        const pointCount = Number(savedTrack?.pointCount || savedTrack?.points?.length || 0)
        uni.showToast({
          title: pointCount ? `已保存 ${pointCount} 个点` : '轨迹已保存',
          icon: 'none',
          duration: 2200,
        })
      } catch (error) {
        uni.showToast({
          title: error?.message || '结束保存失败',
          icon: 'none',
          duration: 2500,
        })
      }
    },
  })
}

async function recenterMap() {
  mapScale.value = RECENTER_MAP_SCALE
  if (!currentLocation.value) {
    await refreshLocation()
    return
  }

  uni.showToast({
    title: '已回到当前位置',
    icon: 'none',
  })
}

function zoomInMap() {
  const nextScale = clampMapScale(mapScale.value + 1)
  if (nextScale === mapScale.value) {
    uni.showToast({
      title: '已经放到最大了',
      icon: 'none',
    })
    return
  }

  mapScale.value = nextScale
}

function zoomOutMap() {
  const nextScale = clampMapScale(mapScale.value - 1)
  if (nextScale === mapScale.value) {
    uni.showToast({
      title: '已经缩到最小了',
      icon: 'none',
    })
    return
  }

  mapScale.value = nextScale
}

function clampMapScale(value) {
  const scale = Number(value) || RECENTER_MAP_SCALE
  return Math.max(MIN_MAP_SCALE, Math.min(MAX_MAP_SCALE, Math.round(scale)))
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
  if (isGuardMode.value) {
    acknowledgeGuardSafe(5)
  }
  uni.showToast({
    title: isGuardMode.value ? '守护模式已开启' : '守护模式已关闭',
    icon: 'none',
  })
}

function cleanup() {
  if (sunsetTimer) {
    clearInterval(sunsetTimer)
    sunsetTimer = null
  }
}

function startSunsetTimer() {
  nowTick.value = Date.now()
  if (sunsetTimer) {
    clearInterval(sunsetTimer)
  }

  sunsetTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
}

function acknowledgeGuardSafe(cooldownMinutes = 20) {
  const currentTime = Date.now()
  lastGuardSafeAt.value = currentTime
  guardCooldownUntil.value = currentTime + cooldownMinutes * 60000
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

function getSunsetWarningLevel(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value <= 0) {
    return 3
  }
  if (value <= 60) {
    return 2
  }
  if (value <= 120) {
    return 1
  }
  return 0
}

function showSunsetWarning(level, minutes) {
  if (!currentLocation.value) {
    return
  }

  const countdown = sunsetCountdownText.value || '日落临近'
  if (level === 1) {
    uni.showModal({
      title: '日落提醒',
      content: `${countdown}。天黑后风险会明显上升，请尽快评估是否原路下撤，避免继续深入。`,
      confirmText: '知道了',
      showCancel: false,
    })
    return
  }

  if (level === 2) {
    uni.showModal({
      title: '尽快下撤',
      content: `${countdown}。现在已接近日落，建议立即停止继续深入，优先下撤或寻找安全停留点。`,
      confirmText: '收到',
      showCancel: false,
    })
    return
  }

  if (level === 3 && Number(minutes) > -30) {
    uni.showModal({
      title: '已过日落',
      content: `${countdown}。请立即结束继续行进，优先确保视线、保暖和安全停留条件。`,
      confirmText: '知道了',
      showCancel: false,
    })
  }
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
