<template>
  <view class="track-preview-page">
    <view class="status-space" :style="statusBarStyle"></view>

    <view class="topbar">
      <view class="icon-btn" @tap="goBack">‹</view>
      <view class="topbar-copy">
        <text class="topbar-title">轨迹大图</text>
        <text class="topbar-subtitle">{{ headerSubtitle }}</text>
      </view>
    </view>

    <view v-if="track" class="content-shell">
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-value">{{ distanceText }}</text>
          <text class="stat-label">路线距离</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ durationText }}</text>
          <text class="stat-label">记录时长</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ ascentText }}</text>
          <text class="stat-label">累计爬升</text>
        </view>
      </view>

      <view class="safe-card">
        <text class="safe-title">路线概览</text>
        <text class="safe-copy">轨迹点数：{{ pointCountText }}</text>
        <text class="safe-copy">终点坐标：{{ coordinateText }}</text>
      </view>

      <view class="map-card">
        <map
          v-if="mapTrackCenter"
          class="preview-map"
          :latitude="mapTrackCenter.latitude"
          :longitude="mapTrackCenter.longitude"
          :scale="mapScale"
          :polyline="mapTrackPolyline"
          :markers="[]"
          :show-location="false"
          :enable-overlooking="false"
          :enable-rotate="false"
          :enable-satellite="false"
          :enable-traffic="false"
        ></map>
        <view v-else class="map-empty">暂无可展示的轨迹地图</view>

        <view class="zoom-group">
          <view class="zoom-btn" :class="{ disabled: mapScale >= MAX_MAP_SCALE }" @tap="zoomIn">+</view>
          <view class="zoom-btn" :class="{ disabled: mapScale <= MIN_MAP_SCALE }" @tap="zoomOut">-</view>
        </view>
      </view>

      <view class="points-card">
        <view class="points-head">
          <text class="points-title">轨迹点</text>
          <text class="points-badge">{{ pointCountText }}</text>
        </view>
        <view v-for="(point, index) in previewPoints" :key="`${index}-${point.latitude}-${point.longitude}`" class="point-row">
          <text class="point-index">{{ index + 1 }}</text>
          <text class="point-text">{{ formatPoint(point) }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-shell">
      <text class="empty-title">未找到轨迹数据</text>
      <text class="empty-subtitle">请返回攻略详情页后重新打开大图。</text>
      <view class="primary-btn" @tap="goBack">返回</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { clearGuideTrackPreview, loadGuideTrackPreview } from '../../common/guide-track-preview'
import { normalizeGuideTrack, formatTrackDuration } from '../../common/guide-track'
import { buildTrackPolyline, formatCoordinate } from '../../common/hiking-metrics'
import { wgs84ToGcj02 } from '../../common/coord-transform'

const MIN_MAP_SCALE = 12
const MAX_MAP_SCALE = 18
const DEFAULT_MAP_SCALE = 15
const track = ref(null)
const guideTitle = ref('')
const mapScale = ref(DEFAULT_MAP_SCALE)

const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : {}
const statusBarHeight = systemInfo.statusBarHeight || 20
const statusBarStyle = computed(() => ({ height: `${statusBarHeight}px` }))

const headerSubtitle = computed(() => guideTitle.value || '徒步路线预览')
const trackCenter = computed(() => track.value?.endPoint || track.value?.startPoint || null)
const trackPolyline = computed(() => buildTrackPolyline(track.value?.points || []))
const mapTrackCenter = computed(() => convertPointToMap(trackCenter.value))
const mapTrackPolyline = computed(() => {
  return trackPolyline.value
    .map((line) => ({
      ...line,
      points: Array.isArray(line?.points) ? line.points.map((point) => convertPointToMap(point)).filter(Boolean) : [],
    }))
    .filter((line) => line.points.length)
})
const distanceText = computed(() => {
  const distanceKm = Number(track.value?.distanceKm || 0)
  return distanceKm > 0 ? `${distanceKm.toFixed(2)} km` : '--'
})
const durationText = computed(() => formatTrackDuration(track.value?.durationMs || 0))
const ascentText = computed(() => {
  const ascent = Number(track.value?.altitudeGain || 0)
  return ascent > 0 ? `${Math.round(ascent)} m` : '--'
})
const pointCountText = computed(() => `${Number(track.value?.pointCount || track.value?.points?.length || 0)} 点`)
const previewPoints = computed(() => Array.isArray(track.value?.points) ? track.value.points.slice(0, 6) : [])
const coordinateText = computed(() => {
  const points = Array.isArray(track.value?.points) ? track.value.points : []
  const point = points.length ? points[points.length - 1] : null
  if (!point) {
    return '--'
  }

  return `${formatCoordinate(point.latitude, 'lat')} / ${formatCoordinate(point.longitude, 'lng')}`
})

onLoad(() => {
  const payload = loadGuideTrackPreview()
  guideTitle.value = String(payload?.title || '').trim()
  track.value = normalizeGuideTrack(payload?.track)
})

onUnload(() => {
  clearGuideTrackPreview()
})

function formatPoint(point) {
  return `${formatCoordinate(point.latitude, 'lat')} / ${formatCoordinate(point.longitude, 'lng')}`
}

function convertPointToMap(point) {
  const latitude = Number(point?.latitude)
  const longitude = Number(point?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const converted = wgs84ToGcj02(longitude, latitude)
  if (!converted) {
    return null
  }

  return {
    ...point,
    longitude: converted.longitude,
    latitude: converted.latitude,
  }
}

function zoomIn() {
  if (mapScale.value >= MAX_MAP_SCALE) {
    return
  }

  mapScale.value += 1
}

function zoomOut() {
  if (mapScale.value <= MIN_MAP_SCALE) {
    return
  }

  mapScale.value -= 1
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({ url: '/pages/guides/index' })
}
</script>

<style scoped lang="scss">
.track-preview-page {
  min-height: 100vh;
  padding: 0 24rpx 36rpx;
  background: linear-gradient(180deg, #f7f1e8 0%, #fbf8f3 38%, #f4efe7 100%);
}

.status-space {
  width: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx 4rpx 26rpx;
}

.icon-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  font-size: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topbar-copy {
  flex: 1;
  min-width: 0;
}

.topbar-title,
.stat-value,
.safe-title,
.empty-title,
.points-title,
.point-index,
.point-text {
  display: block;
  color: #111827;
}

.topbar-title {
  font-size: 32rpx;
  font-weight: 700;
}

.topbar-subtitle,
.stat-label,
.safe-copy,
.empty-subtitle,
.points-badge {
  display: block;
  color: rgba(17, 24, 39, 0.64);
}

.topbar-subtitle {
  margin-top: 6rpx;
  font-size: 22rpx;
}

.content-shell {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.stat-card,
.safe-card,
.map-card,
.points-card,
.empty-shell {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 2rpx solid rgba(146, 64, 14, 0.08);
}

.stat-card {
  padding: 24rpx 18rpx;
}

.stat-value {
  font-size: 28rpx;
  font-weight: 700;
}

.stat-label,
.safe-copy,
.points-badge,
.point-text,
.empty-subtitle {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
}

.safe-card,
.map-card,
.points-card,
.empty-shell {
  padding: 28rpx 24rpx;
}

.map-card {
  position: relative;
  height: 920rpx;
  padding: 0;
  overflow: hidden;
  background: #ebe7df;
}

.preview-map,
.map-empty {
  width: 100%;
  height: 100%;
}

.map-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(17, 24, 39, 0.58);
  font-size: 24rpx;
}

.zoom-group {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.zoom-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: rgba(15, 23, 42, 0.78);
  color: #fffdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 500;
}

.zoom-btn.disabled {
  opacity: 0.42;
}

.safe-title,
.points-title,
.empty-title {
  font-size: 30rpx;
  font-weight: 700;
}

.points-head,
.point-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.points-head {
  justify-content: space-between;
}

.point-row {
  padding-top: 18rpx;
}

.point-row + .point-row {
  border-top: 2rpx solid rgba(17, 24, 39, 0.06);
  margin-top: 18rpx;
}

.point-index {
  width: 40rpx;
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 700;
}

.point-text {
  flex: 1;
  margin-top: 0;
}

.primary-btn {
  margin-top: 28rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fffdf8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
