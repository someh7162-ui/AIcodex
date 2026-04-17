<template>
  <view class="map-container">
    <H5AmapTiandituMap
      v-if="isWebMapRuntime && hasMapLocation"
      class="live-map"
      :map-center="mapCenter"
      :map-scale="mapScale"
      :map-polyline="mapPolyline"
      :map-markers="mapMarkers"
      :map-mode-key="mapModeKey"
    />
    <map
      v-else-if="hasMapLocation"
      class="live-map"
      :latitude="mapCenter.latitude"
      :longitude="mapCenter.longitude"
      :scale="mapScale"
      :show-location="true"
      :enable-rotate="true"
      :enable-traffic="false"
      :polyline="mapPolyline"
      :markers="mapMarkers"
    ></map>
    <view v-else class="map-placeholder">
      <view class="map-fallback-copy">
        <text class="fallback-title">等待定位中</text>
        <text class="fallback-desc">已接入原生 GPS 定位与徒步地图桥接，获取到位置后会显示真实地图与轨迹。</text>
      </view>
    </view>

    <view class="map-overlay"></view>

    <view class="map-mode-switch" @tap="$emit('cycle-map-mode')">
      <text class="map-mode-label">切换地图</text>
      <text class="map-mode-value">{{ mapModeLabel }}</text>
    </view>

    <view class="map-tools">
      <view class="tool-btn" @tap="$emit('refresh')">
        <text class="icon"></text>
        <text class="text">定位刷新</text>
      </view>
      <view class="tool-btn" @tap="$emit('recenter')">
        <text class="icon"></text>
        <text class="text">回到当前</text>
      </view>
      <view class="tool-btn" @tap="$emit('toggle-track')">
        <text class="icon"></text>
        <text class="text">{{ isTracking ? '停止记录' : '开始记录' }}</text>
      </view>
    </view>

    <view class="offline-banner" :class="{ visible: isOffline }">
      <text class="offline-title">{{ isOffline ? '离线 GPS 模式' : '在线地图模式' }}</text>
      <text class="offline-desc">{{ offlineHint }}</text>
    </view>
  </view>
</template>

<script setup>
import H5AmapTiandituMap from './H5AmapTiandituMap.vue'
import { hasAmapKey } from '../../../config/amap'

const isWebMapRuntime = typeof window !== 'undefined' && typeof document !== 'undefined' && hasAmapKey()

defineProps({
  hasMapLocation: {
    type: Boolean,
    default: false,
  },
  mapCenter: {
    type: Object,
    default: null,
  },
  mapScale: {
    type: Number,
    default: 15,
  },
  mapPolyline: {
    type: Array,
    default: () => [],
  },
  mapMarkers: {
    type: Array,
    default: () => [],
  },
  isTracking: {
    type: Boolean,
    default: false,
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
</script>

<style scoped lang="scss">
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.live-map,
.map-placeholder {
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
  }

  .text {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    padding: 0 12rpx;
  }
}

.offline-banner {
  position: absolute;
  left: 24rpx;
  bottom: 26rpx;
  right: 180rpx;
  z-index: 3;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(10, 10, 10, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.offline-banner.visible {
  border-color: rgba(255, 149, 0, 0.22);
  box-shadow: 0 0 0 2rpx rgba(255, 149, 0, 0.08);
}

.offline-title,
.offline-desc {
  display: block;
}

.offline-title {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.offline-desc {
  margin-top: 8rpx;
  font-size: 18rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.68);
}
</style>
