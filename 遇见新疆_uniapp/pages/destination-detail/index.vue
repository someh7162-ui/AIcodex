<template>
  <view class="page-shell">
    <view v-if="destination" class="page-scroll">
      <view class="hero-card">
        <CachedImage :src="destination.image" image-class="cover-image" />
        <view class="hero-mask"></view>
        <view class="detail-topbar">
          <view class="back-btn" @tap="goBack"><text>返回</text></view>
        </view>
        <view class="hero-info">
          <view class="category-chip">{{ destination.category }}</view>
          <text class="hero-title">{{ destination.name }}</text>
          <text class="hero-location">{{ destination.location }}</text>
          <text class="hero-desc">{{ destination.description }}</text>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">地图与定位</text>
        <view class="map-card card">
          <view class="map-head">
            <view>
              <text class="map-title">景区位置与导航</text>
              <text class="map-subtitle muted-text">展示景区地图位置，并可估算当前出发的时间和距离</text>
            </view>
            <view class="map-status" :class="{ ready: locationReady }">{{ locationStatusText }}</view>
          </view>

          <view class="location-meta">
            <text class="meta-label">景区位置</text>
            <text class="meta-value">{{ scenicLocationText }}</text>
          </view>
          <view class="location-meta scenic-meta">
            <text class="meta-label">路线方式</text>
            <view class="route-mode-group">
              <view
                v-for="item in routeModeOptions"
                :key="item.value"
                class="route-mode-chip"
                :class="{ active: routeMode === item.value }"
                @tap="changeRouteMode(item.value)"
              >
                {{ item.label }}
              </view>
            </view>
          </view>
          <view class="route-summary card-lite scenic-meta">
            <view class="route-summary-item">
              <text class="meta-label">预计时间</text>
              <text class="route-highlight">{{ routeDurationText }}</text>
            </view>
            <view class="route-summary-item">
              <text class="meta-label">预计距离</text>
              <text class="route-highlight">{{ routeDistanceText }}</text>
            </view>
            <view v-if="routeMode === 'taxi'" class="route-summary-item route-summary-wide">
              <text class="meta-label">打车预估</text>
              <text class="meta-value">{{ taxiCostText }}</text>
            </view>
          </view>

          <view v-if="mapImageUrl" class="map-preview">
            <CachedImage :src="mapImageUrl" image-class="cover-image" />
          </view>
          <view v-else class="map-fallback">
            <text class="map-fallback-title">等待高德地图 Key</text>
            <text class="map-fallback-desc muted-text">填入高德 Web 服务 Key 后，这里会显示景区静态地图并支持驾车时间估算。</text>
          </view>

          <view class="map-actions">
            <view class="primary-btn" @tap="openScenicLocation">地图导航</view>
            <view class="secondary-btn" @tap="refreshLocationAndWeather">刷新路线</view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">当地天气</text>
        <view class="weather-card card">
          <view class="weather-main">
            <text class="weather-temp">{{ liveWeather.temperature }}</text>
            <view class="weather-texts">
              <text class="weather-condition">{{ liveWeather.condition }}</text>
              <text class="muted-text">{{ weatherSourceText }}</text>
            </view>
          </view>
          <view class="weather-grid">
            <view class="weather-item">
              <text class="weather-label">湿度</text>
              <text class="weather-value">{{ liveWeather.humidity }}</text>
            </view>
            <view class="weather-item">
              <text class="weather-label">风力</text>
              <text class="weather-value">{{ liveWeather.wind }}</text>
            </view>
          </view>
          <text v-if="weatherError" class="weather-note">{{ weatherError }}</text>
          <text v-else-if="!hasRealWeather" class="weather-note">当前显示的是本地预设天气，填入高德 Key 后会自动切换为实时天气。</text>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">游玩建议</text>
        <view class="tips-list">
          <view v-for="tip in destination.tips" :key="tip" class="tip-card card">
            <view class="tip-dot"></view>
            <text class="tip-text">{{ tip }}</text>
          </view>
        </view>
        <view class="suggestion-box">
          <text class="suggestion-title">路线建议</text>
          <text class="suggestion-text">{{ destination.suggestion }}</text>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">抖音直播参考</text>
        <view class="live-card card">
          <view class="live-preview">
            <CachedImage :src="destination.image" image-class="cover-image" />
            <view class="live-badge">
              <view class="live-dot"></view>
              <text>DY</text>
            </view>
          </view>
          <view class="live-body">
            <text class="live-title">{{ destination.liveTitle }}</text>
            <text class="live-hint muted-text">{{ destination.liveHint }}</text>
            <text class="live-keyword">搜索词：{{ destination.liveKeyword }}</text>
            <view class="live-actions one-col">
              <view class="primary-btn" @tap="openDouyinSearch">跳转抖音搜索</view>
              <view class="secondary-btn" @tap="copyKeyword">复制搜索词</view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

      <view v-else class="empty-shell section">
        <text class="section-title">景区不存在</text>
        <view class="primary-btn narrow-btn" @tap="goBack">返回上一页</view>
      </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { getDestinationById, getDouyinSearchUrl } from '../../common/destination-data'
import { getCurrentLocation, getDrivingRoute, getLiveWeather, getStaticMapUrl, getWalkingRoute, reverseGeocode } from '../../services/amap'
import { hasAmapKey } from '../../config/amap'

const routeModeOptions = [
  { label: '驾车', value: 'driving' },
  { label: '步行', value: 'walking' },
  { label: '打车', value: 'taxi' },
]

const currentId = ref('')
const destination = computed(() => getDestinationById(currentId.value))

const locationReady = ref(false)
const locationStatusText = ref('未定位')
const routeMode = ref('driving')
const routeData = ref(null)
const liveWeatherData = ref(null)
const weatherError = ref('')

const liveWeather = computed(() => {
  if (liveWeatherData.value) {
    return {
      temperature: `${liveWeatherData.value.temperature}°C`,
      condition: liveWeatherData.value.weather || '实时天气',
      humidity: `${liveWeatherData.value.humidity || '--'}%`,
      wind: `${liveWeatherData.value.winddirection || ''}${liveWeatherData.value.windpower || ''}级`,
    }
  }

  return destination.value?.weather || {
    temperature: '--',
    condition: '暂无天气',
    humidity: '--',
    wind: '--',
  }
})

const hasRealWeather = computed(() => Boolean(liveWeatherData.value))

const weatherSourceText = computed(() => {
  if (liveWeatherData.value) {
    return '高德实时天气'
  }
  return hasAmapKey() ? '天气接口失败，已降级为预设天气' : '待填写高德 Key 后自动切换为实时天气'
})

const scenicLocationText = computed(() => {
  if (!destination.value) {
    return '暂无景区信息'
  }

  const coords = destination.value.coordinates
  if (!coords) {
    return destination.value.location
  }

  return `${destination.value.location} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
})

const routeDurationText = computed(() => formatDuration(routeData.value?.duration))

const routeDistanceText = computed(() => formatDistance(routeData.value?.distance))

const taxiCostText = computed(() => {
  if (routeMode.value !== 'taxi') {
    return ''
  }

  if (routeData.value?.taxiCost) {
    return `约 ${routeData.value.taxiCost} 元`
  }

  return hasAmapKey() ? '定位后自动估算' : '待填写高德 Key 后可估算'
})

const mapImageUrl = computed(() => {
  const coords = destination.value?.coordinates
  if (!coords) {
    return ''
  }

  const markers = [
    { longitude: coords.longitude, latitude: coords.latitude, label: '景' },
  ]

  return getStaticMapUrl({
    longitude: coords.longitude,
    latitude: coords.latitude,
    markers,
  })
})

onLoad(async (options) => {
  currentId.value = options?.id || ''
  await refreshLocationAndWeather()
})

async function refreshLocationAndWeather() {
  if (!destination.value) {
    return
  }

  weatherError.value = ''
  locationStatusText.value = hasAmapKey() ? '定位中' : '待 Key'
  routeData.value = null
  liveWeatherData.value = null

  if (!hasAmapKey()) {
    locationReady.value = false
    return
  }

  const scenicCoords = destination.value.coordinates

  try {
    const scenicRegeo = scenicCoords
      ? await reverseGeocode(scenicCoords.longitude, scenicCoords.latitude)
      : null
    const scenicAdcode = scenicRegeo?.addressComponent?.adcode
    const weather = scenicAdcode ? await getLiveWeather(scenicAdcode) : null

    if (weather) {
      liveWeatherData.value = weather
    }
  } catch (error) {
    weatherError.value = '实时天气获取失败，当前显示预设天气。'
  }

  try {
    const location = await getCurrentLocation()
    const route = await loadRoute(location, scenicCoords, routeMode.value)

    if (location) {
      locationReady.value = true
      locationStatusText.value = '已定位'
    }

    if (route) {
      routeData.value = route
    }
  } catch (error) {
    locationReady.value = false
    locationStatusText.value = '定位失败'
  }
}

async function changeRouteMode(mode) {
  if (routeMode.value === mode) {
    return
  }

  routeMode.value = mode
  await refreshLocationAndWeather()
}

async function loadRoute(origin, destinationCoords, mode) {
  if (mode === 'walking') {
    return getWalkingRoute(origin, destinationCoords)
  }

  return getDrivingRoute(origin, destinationCoords)
}

function formatDuration(duration) {
  if (duration) {
    const totalMinutes = Math.round(Number(duration) / 60)
    if (totalMinutes < 60) {
      return `约 ${totalMinutes} 分钟`
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes ? `约 ${hours} 小时 ${minutes} 分钟` : `约 ${hours} 小时`
  }

  if (!hasAmapKey()) {
    return '待填写高德 Key 后可估算'
  }

  if (locationStatusText.value === '定位失败') {
    return '定位失败，暂时无法估算'
  }

  return '定位后自动估算'
}

function formatDistance(distance) {
  if (distance) {
    const distanceNum = Number(distance)
    if (distanceNum < 1000) {
      return `约 ${Math.round(distanceNum)} 米`
    }
    return `约 ${(distanceNum / 1000).toFixed(1)} 公里`
  }

  if (!hasAmapKey()) {
    return '待填写高德 Key 后可估算'
  }

  if (locationStatusText.value === '定位失败') {
    return '定位失败，暂时无法估算'
  }

  return '定位后自动估算'
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: '/pages/home/index' })
}

function openDouyinSearch() {
  if (!destination.value) {
    return
  }

  const url = getDouyinSearchUrl(destination.value.liveKeyword)
  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    plus.runtime.openURL(url)
    return
  }

  // H5/部分端
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank')
    return
  }

  uni.setClipboardData({
    data: destination.value.liveKeyword,
    success: () => {
      uni.showModal({
        title: '已准备跳转',
        content: '已复制抖音搜索词。当前端若不支持直接打开抖音，请手动粘贴搜索。',
        showCancel: false,
      })
    },
  })
}

function copyKeyword() {
  if (!destination.value) {
    return
  }
  uni.setClipboardData({
    data: destination.value.liveKeyword,
    success: () => {
      uni.showToast({ title: '已复制搜索词', icon: 'none' })
    },
  })
}

function openScenicLocation() {
  const coords = destination.value?.coordinates
  if (!coords) {
    return
  }

  const amapUrl = `amapuri://route/plan/?dlat=${coords.latitude}&dlon=${coords.longitude}&dname=${encodeURIComponent(destination.value.name)}&dev=0&t=0`

  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    plus.runtime.openURL(amapUrl, () => {
      uni.openLocation({
        longitude: coords.longitude,
        latitude: coords.latitude,
        name: destination.value.name,
        address: destination.value.location,
      })
    })
    return
  }

  uni.openLocation({
    longitude: coords.longitude,
    latitude: coords.latitude,
    name: destination.value.name,
    address: destination.value.location,
  })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero-card {
  position: relative;
  height: 640rpx;
  overflow: hidden;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.6));
}

.detail-topbar {
  position: absolute;
  top: 36rpx;
  left: 24rpx;
  right: 24rpx;
  z-index: 2;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  backdrop-filter: blur(8px);
}

.hero-info {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 40rpx;
  z-index: 2;
  color: #ffffff;
}

.category-chip {
  display: inline-flex;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  margin-bottom: 18rpx;
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
}

.hero-location,
.hero-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.7;
}

.section-block {
  margin-top: 36rpx;
}

.map-card,
.weather-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.map-head,
.weather-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22rpx;
}

.map-title,
.suggestion-title,
.live-title,
.weather-condition {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.map-subtitle,
.weather-note,
.tip-text,
.suggestion-text,
.live-hint,
.live-keyword,
.meta-value,
.meta-label,
.weather-label,
.weather-value {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
}

.map-status {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(139, 111, 71, 0.12);
  color: $theme-muted;
  flex-shrink: 0;
}

.map-status.ready {
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
}

.location-meta {
  margin-top: 22rpx;
}

.route-mode-group {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
  margin-top: 14rpx;
}

.route-mode-chip {
  min-width: 120rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.12);
  color: $theme-text;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.route-mode-chip.active {
  background: $theme-color;
  color: #ffffff;
}

.scenic-meta {
  margin-top: 12rpx;
}

.route-summary {
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.card-lite {
  border: 2rpx solid rgba(232, 168, 124, 0.2);
}

.route-summary-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.route-summary-wide {
  grid-column: 1 / -1;
}

.route-highlight {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $theme-color;
}

.meta-label {
  color: $theme-muted;
}

.map-preview {
  position: relative;
  height: 320rpx;
  margin-top: 22rpx;
  overflow: hidden;
  border-radius: 28rpx;
}

.map-fallback {
  margin-top: 22rpx;
  padding: 32rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.12);
  border: 2rpx dashed rgba(196, 69, 54, 0.24);
}

.map-fallback-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.map-fallback-desc {
  margin-top: 10rpx;
}

.map-actions,
.live-actions {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.live-actions.one-col {
  grid-template-columns: 1fr;
}

.weather-temp {
  font-size: 68rpx;
  font-weight: 700;
  color: $theme-color;
}

.weather-texts {
  flex: 1;
}

.weather-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.weather-item {
  padding: 20rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.14);
}

.weather-value {
  margin-top: 8rpx;
  font-weight: 600;
}

.weather-note {
  margin-top: 18rpx;
  color: $theme-muted;
}

.tips-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.tip-card {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 24rpx;
}

.tip-dot {
  width: 14rpx;
  height: 14rpx;
  margin-top: 10rpx;
  border-radius: 50%;
  background: $theme-color;
  flex-shrink: 0;
}

.suggestion-box {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.16);
  border: 2rpx solid rgba(232, 168, 124, 0.34);
}

.live-card {
  margin-top: 24rpx;
  overflow: hidden;
}

.live-preview {
  position: relative;
  height: 300rpx;
}

.live-badge {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #ffffff;
}

.live-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff584d;
}

.live-body {
  padding: 26rpx;
}

.live-keyword {
  margin-top: 10rpx;
  color: $theme-color;
}

.primary-btn,
.secondary-btn,
.narrow-btn {
  height: 84rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.primary-btn {
  background: $theme-color;
  color: #ffffff;
}

.secondary-btn {
  background: #ffffff;
  border: 2rpx solid rgba(196, 69, 54, 0.16);
  color: $theme-text;
}

.empty-shell {
  padding-top: 120rpx;
}

.narrow-btn {
  margin-top: 28rpx;
}
</style>
