<template>
  <view class="static-map-wrap">
    <image v-if="mapUrl" class="static-map-image" :src="mapUrl" mode="aspectFill" @error="handleError"></image>
    <view v-else class="static-map-empty">
      <text class="empty-title">静态地图不可用</text>
      <text class="empty-desc">当前还没有可用坐标或高德静态图地址为空。</text>
    </view>

    <view class="compat-chip">
      <text class="compat-chip-title">静态地图兼容模式</text>
      <text class="compat-chip-desc">已切到单张高德静态图，避免 Android 原生地图与瓦片链路冲突。</text>
    </view>

    <view v-if="loadFailed" class="error-chip">
      <text class="error-text">静态地图图片加载失败</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getStaticMapUrl } from '../../../services/amap'

const props = defineProps({
  mapCenter: {
    type: Object,
    default: null,
  },
  mapScale: {
    type: Number,
    default: 15,
  },
  mapMarkers: {
    type: Array,
    default: () => [],
  },
})

const loadFailed = ref(false)

const mapUrl = computed(() => {
  const longitude = Number(props.mapCenter?.longitude)
  const latitude = Number(props.mapCenter?.latitude)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return ''
  }

  const markers = Array.isArray(props.mapMarkers) && props.mapMarkers.length
    ? props.mapMarkers.map((item, index) => ({
        longitude: Number(item.longitude),
        latitude: Number(item.latitude),
        label: index === 0 ? '你' : '',
        size: index === 0 ? 'large' : 'mid',
      })).filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude))
    : [{ longitude, latitude, label: '你', size: 'large' }]

  const url = getStaticMapUrl({
    longitude,
    latitude,
    markers,
    zoom: Math.max(8, Math.min(17, Math.round(Number(props.mapScale || 15)))),
    size: '1024*1024',
  })

  loadFailed.value = false
  return url ? `${url}&_ts=${Date.now()}` : ''
})

function handleError() {
  loadFailed.value = true
}
</script>

<style scoped lang="scss">
.static-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #0c0f12 0%, #050607 100%);
}

.static-map-image,
.static-map-empty {
  width: 100%;
  height: 100%;
}

.static-map-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.empty-title,
.empty-desc,
.error-text,
.compat-chip-title,
.compat-chip-desc {
  display: block;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.compat-chip,
.error-chip {
  position: absolute;
  left: 18rpx;
  z-index: 2;
  padding: 12rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(7, 10, 12, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.compat-chip {
  top: 18rpx;
}

.error-chip {
  top: 122rpx;
  border-color: rgba(255, 69, 58, 0.3);
}

.compat-chip-title {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}

.compat-chip-desc,
.error-text {
  margin-top: 6rpx;
  max-width: 420rpx;
  font-size: 18rpx;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.72);
}

.error-text {
  margin-top: 0;
  color: #ffb4ae;
}
</style>
