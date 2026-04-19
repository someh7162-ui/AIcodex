<template>
  <view class="map-container">
    <!-- #ifdef H5 -->
    <H5AmapTiandituMap
      v-if="h5MapReady"
      class="live-map"
      :map-center="amapMapCenter"
      :map-scale="mapScale"
      :map-polyline="amapMapPolyline"
      :map-markers="amapMapMarkers"
      :map-mode-key="mapModeKey"
    />
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <AppAmapWebview
      v-if="appOnlineMapReady"
      class="live-map"
      :map-center="amapMapCenter"
      :map-scale="mapScale"
      :map-polyline="amapMapPolyline"
      :map-markers="amapMapMarkers"
      :map-mode-key="mapModeKey"
    />
    <HikingTileMapCompat
      v-else-if="appOfflineMapReady"
      class="live-map"
      :map-center="storeMapCenter"
      :map-scale="mapScale"
      :map-polyline="storeMapPolyline"
      :map-markers="storeMapMarkers"
      :map-mode-key="mapModeKey"
    />
    <!-- #endif -->

    <view v-if="showMapPlaceholder" class="map-placeholder">
      <view class="map-fallback-copy">
        <text class="fallback-title">等待定位中</text>
        <text class="fallback-desc">已接入原生 GPS 定位与徒步地图桥接，获取到位置后会显示真实地图与轨迹。</text>
      </view>
    </view>

    <view class="map-tools">
      <view class="zoom-group">
        <view class="zoom-btn" @tap="$emit('zoom-in')">
          <text class="zoom-symbol">+</text>
        </view>
        <view class="zoom-btn" @tap="$emit('zoom-out')">
          <text class="zoom-symbol">-</text>
        </view>
      </view>
      <view class="tool-btn" @tap="$emit('refresh')">
        <text class="icon">刷</text>
        <text class="text">定位刷新</text>
      </view>
      <view class="tool-btn" @tap="$emit('recenter')">
        <text class="icon">回</text>
        <text class="text">回到当前</text>
      </view>
      <view class="tool-btn" @tap="$emit('toggle-track')">
        <text class="icon">记</text>
        <text class="text">{{ storeIsTracking ? '停止记录' : '开始记录' }}</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed } from 'vue'
// #ifdef H5
import H5AmapTiandituMap from './H5AmapTiandituMap.vue'
// #endif
// #ifdef APP-PLUS
import AppAmapWebview from './AppAmapWebview.vue'
import HikingTileMapCompat from './HikingTileMapCompat.vue'
// #endif
import { storeToRefs } from 'pinia'
import { wgs84ToGcj02 } from '../../../common/coord-transform'
import { hasAmapKey } from '../../../config/amap'
import { useHikingStore } from '../../../stores/useHikingStore'

const props = defineProps({
  mapScale: {
    type: Number,
    default: 15,
  },
  mapModeKey: {
    type: String,
    default: 'normal',
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
  offlineHint: {
    type: String,
    default: '',
  },
})

defineEmits(['refresh', 'recenter', 'toggle-track', 'zoom-in', 'zoom-out'])

const hikingStore = useHikingStore()
const {
  isTracking: storeIsTracking,
  hasMapLocation: storeHasMapLocation,
  mapCenter: storeMapCenter,
  mapPolyline: storeMapPolyline,
  mapMarkers: storeMapMarkers,
} = storeToRefs(hikingStore)

const amapMapCenter = computed(() => convertPointToAmap(storeMapCenter.value))
const amapMapPolyline = computed(() => convertPolylineToAmap(storeMapPolyline.value))
const amapMapMarkers = computed(() => convertMarkersToAmap(storeMapMarkers.value))
const h5MapReady = computed(() => storeHasMapLocation.value && hasAmapKey())
const appOnlineMapReady = computed(() => {
  return storeHasMapLocation.value && !props.isOffline && hasAmapKey() && hasAppMapSupport()
})
const appOfflineMapReady = computed(() => storeHasMapLocation.value && hasOfflineMapSupport())
const showMapPlaceholder = computed(() => !storeHasMapLocation.value || !hasRenderableMap())

function hasAppMapSupport() {
  // #ifdef APP-PLUS
  return typeof plus !== 'undefined' && Boolean(plus.webview)
  // #endif

  return false
}

function hasOfflineMapSupport() {
  return true
}

function hasRenderableMap() {
  // #ifdef H5
  return h5MapReady.value
  // #endif

  // #ifdef APP-PLUS
  return appOnlineMapReady.value || appOfflineMapReady.value
  // #endif

  return false
}

function convertPointToAmap(point) {
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

function convertPolylineToAmap(lines) {
  if (!Array.isArray(lines)) {
    return []
  }

  return lines
    .map((line) => ({
      ...line,
      points: Array.isArray(line?.points)
        ? line.points.map((point) => convertPointToAmap(point)).filter(Boolean)
        : [],
    }))
    .filter((line) => line.points.length)
}

function convertMarkersToAmap(markers) {
  if (!Array.isArray(markers)) {
    return []
  }

  return markers.map((marker) => {
    const converted = convertPointToAmap(marker)
    return converted
      ? {
          ...marker,
          longitude: converted.longitude,
          latitude: converted.latitude,
        }
      : null
  }).filter(Boolean)
}
</script>

<style scoped lang="scss">
.map-container {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  overflow: hidden;
}

.live-map,
.map-placeholder {
  flex: 1;
  width: 100%;
  height: 100%;
}

.map-placeholder {
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 25%),
    linear-gradient(180deg, #101214 0%, #060708 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.map-fallback-copy {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 28rpx;
  border-radius: 24rpx;
  backdrop-filter: blur(12px);
}

.fallback-title,
.fallback-desc {
  display: block;
}

.fallback-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.fallback-desc {
  font-size: 22rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.68);
}

.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.05) 30%, rgba(0, 0, 0, 0.22) 100%),
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: auto, 40px 40px, 40px 40px;
  pointer-events: none;
}

.map-tools {
  position: absolute;
  right: 30rpx;
  bottom: 100rpx;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.zoom-group {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 24rpx;
  background: rgba(44, 44, 46, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.zoom-btn {
  width: 110rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn + .zoom-btn {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.zoom-symbol {
  font-size: 44rpx;
  line-height: 1;
  font-weight: 700;
  color: #fff;
}

.tool-btn {
  width: 110rpx;
  min-height: 110rpx;
  background: rgba(44, 44, 46, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.3);

  .icon {
    font-size: 40rpx;
    margin-bottom: 4rpx;
    color: #fff;
    font-weight: 700;
    line-height: 1;
  }

  .text {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    padding: 0 12rpx;
  }
}

</style>
