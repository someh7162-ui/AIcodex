<template>
  <view class="page-shell safety-page">
    <view v-if="destination" class="page-scroll">
      <view class="hero-gradient safety-hero section">
        <text class="safety-kicker">Scenic Guide Map</text>
        <text class="safety-title">{{ guidePageTitle }}</text>
        <text class="safety-subtitle">当前页面已改为景区导览攻略图，优先展示导览大图，并补充游览顺序、补给点和出行提醒。</text>
      </view>

      <view class="section safety-shell">
        <view class="card map-card-large">
          <view class="map-headline">
            <view>
              <text class="map-title">{{ offlineMode ? '离线导览攻略图' : '景区导览攻略图' }}</text>
              <text class="map-desc muted-text">{{ modeDescription }}</text>
            </view>
            <view class="map-level">{{ guideModeTag }}</view>
          </view>

          <view v-if="!offlineMode" class="mode-switch">
            <view
              class="mode-chip"
              :class="{ active: activeMode === 'interactive' }"
              @tap="activeMode = 'interactive'"
            >
              交互地图
            </view>
            <view
              class="mode-chip"
              :class="{ active: activeMode === 'guide' }"
              @tap="activeMode = 'guide'"
            >
              导览大图
            </view>
          </view>

          <view v-if="activeMode === 'interactive'" class="interactive-shell">
            <map
              v-if="mapCenter"
              class="interactive-map"
              :longitude="mapCenter.longitude"
              :latitude="mapCenter.latitude"
              :scale="mapScale"
              :enable-scroll="true"
              :enable-zoom="true"
              :enable-rotate="true"
              :enable-overlooking="false"
            ></map>
            <view v-else class="map-empty-state">
              <text class="map-empty-title">暂无可用地图中心点</text>
              <text class="map-empty-copy muted-text">当前景区没有有效坐标，暂时无法生成交互地图。</text>
            </view>

            <view class="map-floating-tools">
              <view class="floating-btn" @tap="zoomIn">+</view>
              <view class="floating-btn" @tap="zoomOut">-</view>
            </view>

          </view>

          <view v-else class="guide-shell">
            <view v-if="displayGuideImageUrl" class="guide-preview" @tap="previewGuideImage">
              <CachedImage
                :src="displayGuideImageUrl"
                image-class="guide-image"
                mode="aspectFit"
                :fallback-to-remote="false"
                @error="handleGuideImageError"
                @load="handleGuideImageLoad"
              />
              <view class="guide-badge">点击放大查看</view>
            </view>
            <view v-else class="map-empty-state guide-empty-state">
              <text class="map-empty-title">暂无导览大图</text>
              <text class="map-empty-copy muted-text">请先把对应景区导览图放进 static/guide-maps，当前页面不会再回退为错误的自动地图。</text>
            </view>

            <view class="guide-meta card-lite">
              <text class="smart-map-title">导览图说明</text>
              <text class="smart-map-copy muted-text">{{ guideSummaryText }}</text>
            </view>
          </view>

          <view class="map-actions compact-actions">
            <view class="primary-action" @tap="openExternalMap">打开系统地图</view>
            <view v-if="!offlineMode" class="secondary-action" @tap="activeMode = activeMode === 'interactive' ? 'guide' : 'interactive'">切换查看方式</view>
            <view v-if="displayGuideImageUrl" class="secondary-action" @tap="previewGuideImage">放大导览图</view>
            <view v-if="safetyMap.guideMapSourceUrl" class="secondary-action" @tap="openGuideSource">地图来源</view>
          </view>

          <view class="meta-grid">
            <view class="meta-card">
              <text class="meta-label">地形提醒</text>
              <text class="meta-value">{{ safetyMap.terrainRisk }}</text>
            </view>
            <view class="meta-card">
              <text class="meta-label">天气提醒</text>
              <text class="meta-value">{{ safetyMap.weatherRisk }}</text>
            </view>
            <view class="meta-card full-width">
              <text class="meta-label">通信提示</text>
              <text class="meta-value">{{ safetyMap.signalRisk }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">推荐游览顺序</text>
        <view class="route-list">
          <view v-for="(item, index) in safetyMap.safeRoute" :key="item" class="card route-item">
            <view class="route-index">{{ index + 1 }}</view>
            <text class="route-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">补给点与服务点</text>
        <view class="service-list">
          <view v-for="item in safetyMap.servicePoints" :key="item" class="card service-item">
            <view class="service-dot"></view>
            <text class="route-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">攻略补充说明</text>
        <view class="contact-card card">
          <text class="contact-copy">{{ guideHighlightsText }}</text>
          <text class="contact-note muted-text">{{ safetyMap.note }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <view v-else class="empty-shell section">
      <text class="section-title">未找到景区导览攻略图</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { getDestinationById, getDestinationSafetyMap } from '../../common/destination-data'
import { getOfflineMapRecord } from '../../common/offline-map'

const currentId = ref('')
const offlineMode = ref(false)
const offlineRecord = ref(null)
const activeMode = ref('interactive')
const mapScale = ref(14)
const guideImageCandidateIndex = ref(0)
const guideImageUnavailable = ref(false)

const destination = computed(() => getDestinationById(currentId.value))
const onlineSafetyMap = computed(() => getDestinationSafetyMap(currentId.value) || {
  title: '景区导览攻略图',
  zoom: 14,
  coverage: '',
  emergencyLevel: '中',
  terrainRisk: '',
  weatherRisk: '',
  signalRisk: '',
  safeRoute: [],
  servicePoints: [],
  emergencyContacts: [],
  note: '',
  guideMapSourceName: '',
  guideMapSourceUrl: '',
  guideMapImage: '',
})

const safetyMap = computed(() => {
  if (offlineMode.value && offlineRecord.value?.metadata) {
    return offlineRecord.value.metadata
  }

  return onlineSafetyMap.value
})

const guidePageTitle = computed(() => {
  return destination.value ? `${destination.value.name}导览攻略图` : '景区导览攻略图'
})

const guideModeTag = computed(() => {
  if (offlineMode.value) {
    return '离线可看'
  }

  return activeMode.value === 'interactive' ? '地图模式' : '导览模式'
})

const guideHighlightsText = computed(() => {
  const list = Array.isArray(safetyMap.value.highlights) ? safetyMap.value.highlights.filter(Boolean) : []
  if (list.length) {
    return list.join('；')
  }

  return '当前页面以景区导览图和游览顺序建议为主，适合出发前快速做路线规划。'
})

const mapCenter = computed(() => {
  const coords = destination.value?.coordinates
  if (!coords) {
    return null
  }

  return {
    longitude: Number(coords.longitude),
    latitude: Number(coords.latitude),
  }
})

const guidePreviewCandidates = computed(() => {
  const base = String(safetyMap.value.guideMapImage || '').trim()
  if (!base) {
    return []
  }

  const candidates = [base]
  if (/\.jpg$/i.test(base)) {
    candidates.push(`${base}.jpg`)
    candidates.push(base.replace(/\.jpg$/i, '.png'))
    candidates.push(base.replace(/\.jpg$/i, '.jpeg'))
  } else if (/\.png$/i.test(base)) {
    candidates.push(`${base}.png`)
    candidates.push(base.replace(/\.png$/i, '.jpg'))
    candidates.push(base.replace(/\.png$/i, '.jpeg'))
  } else if (/\.jpeg$/i.test(base)) {
    candidates.push(`${base}.jpeg`)
    candidates.push(base.replace(/\.jpeg$/i, '.jpg'))
    candidates.push(base.replace(/\.jpeg$/i, '.png'))
  }

  return Array.from(new Set(candidates))
})

const guidePreviewUrl = computed(() => {
  return guidePreviewCandidates.value[guideImageCandidateIndex.value] || ''
})

function toDisplayPath(filePath) {
  const raw = String(filePath || '').trim()
  if (!raw) {
    return ''
  }

  if (/^(https?:|file:|content:|blob:|data:)/i.test(raw)) {
    return raw
  }

  if (raw.startsWith('/static/') || raw.startsWith('static/')) {
    return raw.startsWith('/') ? raw : `/${raw}`
  }

  if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
    const absolutePath = plus.io.convertLocalFileSystemURL(raw)
    if (absolutePath) {
      return absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`
    }
  }

  return raw
}

const displayGuideImageUrl = computed(() => {
  if (guideImageUnavailable.value) {
    return ''
  }

  if (offlineMode.value && offlineRecord.value?.savedFilePath) {
    return toDisplayPath(offlineRecord.value.savedFilePath)
  }

  if (guidePreviewUrl.value) {
    return toDisplayPath(guidePreviewUrl.value)
  }

  return ''
})

const modeDescription = computed(() => {
  if (offlineMode.value) {
    return '离线模式只展示已保存的景区导览攻略图，适合在景区内直接对照整张图查看。'
  }

  if (activeMode.value === 'interactive') {
    return '当前是地图浏览视图，方便先看景区大致方位和缩放范围。'
  }

  return '当前显示的是景区导览攻略大图，优先读取你手动放入的本地图片。'
})

const guideSummaryText = computed(() => {
  if (offlineMode.value) {
    return '这是你已经保存到本地的离线导览攻略图，弱网或无网时也能直接对照游览。'
  }

  if (safetyMap.value.guideMapSourceName) {
    return `当前导览图优先采用 ${safetyMap.value.guideMapSourceName}，并结合景区现有攻略信息整理成更适合出发前查看的导览页。`
  }

  return '当前导览图以景区总览为主，点击图片可以继续放大查看细节。'
})

onLoad((options = {}) => {
  currentId.value = options.id || ''
  offlineMode.value = options.offline === '1'
  offlineRecord.value = getOfflineMapRecord(currentId.value)
  mapScale.value = Number(safetyMap.value?.zoom || 14)
  activeMode.value = offlineMode.value ? 'guide' : 'interactive'
  guideImageCandidateIndex.value = 0
  guideImageUnavailable.value = false
})

function zoomIn() {
  mapScale.value = Math.min(20, Number(mapScale.value || 14) + 1)
}

function zoomOut() {
  mapScale.value = Math.max(5, Number(mapScale.value || 14) - 1)
}

function previewGuideImage() {
  if (!displayGuideImageUrl.value) {
    return
  }

  uni.previewImage({
    current: displayGuideImageUrl.value,
    urls: [displayGuideImageUrl.value],
  })
}

function handleGuideImageError() {
  if (guidePreviewCandidates.value.length && guideImageCandidateIndex.value < guidePreviewCandidates.value.length - 1) {
    guideImageCandidateIndex.value += 1
    return
  }

  guideImageUnavailable.value = true
}

function handleGuideImageLoad() {
  guideImageUnavailable.value = false
  guideImageCandidateIndex.value = Math.max(0, guideImageCandidateIndex.value)
}

function openExternalMap() {
  const coords = mapCenter.value
  if (!coords || !destination.value) {
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

function openGuideSource() {
  if (!safetyMap.value.guideMapSourceUrl) {
    return
  }

  const url = safetyMap.value.guideMapSourceUrl
  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    plus.runtime.openURL(url)
    return
  }

  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank')
  }
}

</script>

<style scoped lang="scss">
@import '../../uni.scss';

.safety-page {
  background: $theme-bg;
}

.safety-hero {
  padding-top: 104rpx;
  padding-bottom: 92rpx;
  color: #ffffff;
}

.safety-kicker {
  font-size: 22rpx;
  letter-spacing: 3rpx;
  text-transform: uppercase;
  opacity: 0.82;
}

.safety-title {
  display: block;
  margin-top: 16rpx;
  font-size: 50rpx;
  font-weight: 700;
}

.safety-subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 25rpx;
  line-height: 1.8;
  opacity: 0.92;
}

.safety-shell {
  margin-top: -42rpx;
}

.map-card-large,
.contact-card {
  padding: 28rpx;
}

.map-headline,
.section-head-inline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.map-title {
  display: block;
  font-size: 31rpx;
  font-weight: 700;
}

.map-desc,
.meta-label,
.meta-value,
.route-text,
.contact-copy,
.contact-note,
.point-meta {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
}

.map-desc,
.inline-note {
  margin-top: 10rpx;
}

.map-level {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  font-size: 22rpx;
  font-weight: 700;
}

.mode-switch {
  margin-top: 22rpx;
  display: flex;
  gap: 14rpx;
}

.mode-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.08);
  color: $theme-muted;
  font-size: 24rpx;
  font-weight: 600;
}

.mode-chip.active {
  background: $theme-color;
  color: #ffffff;
}

.interactive-shell,
.guide-shell {
  margin-top: 22rpx;
}

.interactive-shell {
  position: relative;
}

.interactive-map,
.guide-preview {
  width: 100%;
  overflow: hidden;
  border-radius: 28rpx;
}

.interactive-map {
  height: 520rpx;
}

.guide-preview {
  position: relative;
  height: 520rpx;
  background: rgba(232, 168, 124, 0.12);
}

.guide-image {
  width: 100%;
  height: 100%;
  display: block;
}

.guide-badge {
  position: absolute;
  right: 18rpx;
  top: 18rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.48);
  color: #ffffff;
  font-size: 22rpx;
}

.map-empty-state,
.smart-map-note,
.guide-meta,
.meta-card {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
}

.guide-empty-state {
  margin-bottom: 18rpx;
}

.map-empty-title,
.smart-map-title,
.point-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $theme-text;
}

.map-empty-copy,
.smart-map-copy {
  display: block;
  margin-top: 8rpx;
}

.smart-map-note,
.guide-meta {
  margin-top: 18rpx;
}

.map-floating-tools {
  position: absolute;
  right: 18rpx;
  top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.floating-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.92);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(45, 24, 16, 0.1);
}

.compact-actions {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.primary-action,
.secondary-action {
  min-width: 200rpx;
  padding: 18rpx 24rpx;
  border-radius: 22rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
}

.primary-action {
  background: $theme-color;
  color: #ffffff;
}

.secondary-action {
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
}

.meta-grid {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.full-width {
  grid-column: 1 / -1;
}

.meta-label {
  color: $theme-muted;
}

.meta-value,
.contact-copy {
  margin-top: 10rpx;
  color: $theme-text;
  font-weight: 600;
}

.section-block {
  margin-top: 38rpx;
}

.route-list,
.service-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.route-item,
.service-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 24rpx;
}

.route-index,
.service-dot {
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.service-dot {
  width: 18rpx;
  height: 18rpx;
  margin-top: 12rpx;
}

.point-dot {
  width: 22rpx;
  height: 22rpx;
}

.point-item {
  align-items: center;
}

.point-copy {
  flex: 1;
  min-width: 0;
}

.contact-note {
  margin-top: 12rpx;
}

.empty-shell {
  padding-top: 120rpx;
}
</style>
