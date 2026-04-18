<template>
  <view class="map-container">
    <!-- #ifdef H5 -->
    <H5AmapTiandituMap
      v-if="storeHasMapLocation && hasAmapKey()"
      class="live-map"
      :map-center="storeMapCenter"
      :map-scale="mapScale"
      :map-polyline="storeMapPolyline"
      :map-markers="storeMapMarkers"
      :map-mode-key="mapModeKey"
    />
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <HikingTileMapCompat
      v-if="storeHasMapLocation && hasMapSupport()"
      class="live-map"
      :map-center="storeMapCenter"
      :map-scale="mapScale"
      :map-polyline="storeMapPolyline"
      :map-markers="storeMapMarkers"
      :map-mode-key="mapModeKey"
    />
    <!-- #endif -->

    <view v-else class="map-placeholder">
      <view class="map-fallback-copy">
        <text class="fallback-title">等待定位中</text>
        <text class="fallback-desc">已接入原生 GPS 定位与徒步地图桥接，获取到位置后会显示真实地图与轨迹。</text>
      </view>
    </view>

    <view class="map-mode-switch" @tap="$emit('cycle-map-mode')">
      <text class="map-mode-label">切换地图</text>
      <text class="map-mode-value">{{ mapModeLabel }}</text>
    </view>

    <view class="map-tools">
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
// #ifdef H5
import H5AmapTiandituMap from './H5AmapTiandituMap.vue'
// #endif
// #ifdef APP-PLUS
import HikingTileMapCompat from './HikingTileMapCompat.vue'
// #endif
import { storeToRefs } from 'pinia'
import { hasAmapKey } from '../../../config/amap'
import { useHikingStore } from '../../../stores/useHikingStore'

defineProps({
  mapScale: {
    type: Number,
    default: 15,
  },
  mapModeLabel: {
    type: String,
    default: '标准地图',
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

defineEmits(['refresh', 'recenter', 'toggle-track', 'cycle-map-mode'])

const hikingStore = useHikingStore()
const {
  isTracking: storeIsTracking,
  hasMapLocation: storeHasMapLocation,
  mapCenter: storeMapCenter,
  mapPolyline: storeMapPolyline,
  mapMarkers: storeMapMarkers,
} = storeToRefs(hikingStore)

function hasMapSupport() {
  // #ifdef APP-PLUS
  return true
  // #endif

  return hasAmapKey()
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

.map-mode-switch {
  position: absolute;
  top: 28rpx;
  right: 24rpx;
  z-index: 3;
  min-width: 172rpx;
  padding: 18rpx 22rpx;
  border-radius: 22rpx;
  background: rgba(16, 18, 20, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.28);
}

.map-mode-label,
.map-mode-value {
  display: block;
}

.map-mode-label {
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: rgba(255, 255, 255, 0.58);
}

.map-mode-value {
  margin-top: 6rpx;
  font-size: 24rpx;
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
