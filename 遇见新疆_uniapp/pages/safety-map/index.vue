<template>
  <view class="page-shell safety-page">
    <view v-if="destination" class="page-scroll">
      <view class="hero-gradient safety-hero section">
        <text class="safety-kicker">Scenic Safety Map</text>
        <text class="safety-title">{{ safetyMap.title }}</text>
        <text class="safety-subtitle">覆盖 {{ safetyMap.coverage }}，适合在进入景区前先确认主入口、返程线和应急联系信息。</text>
      </view>

      <view class="section safety-shell">
        <view class="card map-card-large">
          <view class="map-headline">
            <view>
              <text class="map-title">{{ offlineMode ? '离线安全图' : '景区核心安全图' }}</text>
              <text class="map-desc muted-text">{{ offlineMode ? '当前优先展示本地已保存版本。' : '当前展示的是景区级安全参考图，建议离线保存后再进山入谷。' }}</text>
            </view>
            <view class="map-level">{{ safetyMap.emergencyLevel }}</view>
          </view>

          <view class="map-preview-large">
            <CachedImage :src="displayMapUrl" image-class="cover-image" />
            <view class="map-badge">{{ offlineMode ? 'OFFLINE' : 'ONLINE' }}</view>
          </view>

          <view class="meta-grid">
            <view class="meta-card">
              <text class="meta-label">地形风险</text>
              <text class="meta-value">{{ safetyMap.terrainRisk }}</text>
            </view>
            <view class="meta-card">
              <text class="meta-label">天气风险</text>
              <text class="meta-value">{{ safetyMap.weatherRisk }}</text>
            </view>
            <view class="meta-card full-width">
              <text class="meta-label">信号提示</text>
              <text class="meta-value">{{ safetyMap.signalRisk }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">推荐安全路线</text>
        <view class="route-list">
          <view v-for="(item, index) in safetyMap.safeRoute" :key="item" class="card route-item">
            <view class="route-index">{{ index + 1 }}</view>
            <text class="route-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">服务点与集合点</text>
        <view class="service-list">
          <view v-for="item in safetyMap.servicePoints" :key="item" class="card service-item">
            <view class="service-dot"></view>
            <text class="route-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">应急联系</text>
        <view class="contact-card card">
          <text class="contact-copy">{{ safetyMap.emergencyContacts.join(' / ') }}</text>
          <text class="contact-note muted-text">{{ safetyMap.note }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <view v-else class="empty-shell section">
      <text class="section-title">未找到景区安全图</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { getDestinationById, getDestinationSafetyMap } from '../../common/destination-data'
import { getOfflineMapRecord } from '../../common/offline-map'
import { getStaticMapUrl } from '../../services/amap'

const currentId = ref('')
const offlineMode = ref(false)
const offlineRecord = ref(null)

const destination = computed(() => getDestinationById(currentId.value))
const onlineSafetyMap = computed(() => getDestinationSafetyMap(currentId.value) || {
  title: '景区安全图',
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
})

const safetyMap = computed(() => {
  if (offlineMode.value && offlineRecord.value?.metadata) {
    return offlineRecord.value.metadata
  }

  return onlineSafetyMap.value
})

const onlineMapUrl = computed(() => {
  const coords = destination.value?.coordinates
  if (!coords) {
    return ''
  }

  return getStaticMapUrl({
    longitude: coords.longitude,
    latitude: coords.latitude,
    zoom: safetyMap.value.zoom,
    size: '1080*720',
    markers: [
      { longitude: coords.longitude, latitude: coords.latitude, label: '景', size: 'large' },
    ],
  })
})

const displayMapUrl = computed(() => {
  if (offlineMode.value && offlineRecord.value?.savedFilePath) {
    return offlineRecord.value.savedFilePath
  }

  return onlineMapUrl.value
})

onLoad((options = {}) => {
  currentId.value = options.id || ''
  offlineMode.value = options.offline === '1'
  offlineRecord.value = getOfflineMapRecord(currentId.value)
})
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

.map-headline {
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
.contact-note {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
}

.map-desc {
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

.map-preview-large {
  position: relative;
  margin-top: 22rpx;
  height: 440rpx;
  overflow: hidden;
  border-radius: 28rpx;
}

.map-badge {
  position: absolute;
  right: 18rpx;
  top: 18rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.48);
  color: #ffffff;
  font-size: 22rpx;
}

.meta-grid {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.meta-card {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
}

.meta-card.full-width {
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

.contact-note {
  margin-top: 12rpx;
}

.empty-shell {
  padding-top: 120rpx;
}

@media screen and (max-width: 720rpx) {
  .meta-grid {
    grid-template-columns: 1fr;
  }

  .meta-card.full-width {
    grid-column: auto;
  }
}
</style>
