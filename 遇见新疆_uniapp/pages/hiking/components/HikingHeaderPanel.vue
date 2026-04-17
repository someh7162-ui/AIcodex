<template>
  <view class="header-panel">
    <view class="info-row">
      <view class="gps-status">
        <text class="dot" :class="{ offline: isOffline }"></text>
        <text>{{ gpsStatusText }}</text>
      </view>
      <view class="meta-group">
        <view v-if="modeText" class="mode-badge">{{ modeText }}</view>
        <view class="coordinates">{{ coordinateText }}</view>
      </view>
    </view>

    <view class="stats-grid">
      <view class="stat-card">
        <view class="label">海拔 (m)</view>
        <view class="value">{{ altitudeText }}</view>
      </view>
      <view class="stat-card">
        <view class="label">里程 (km)</view>
        <view class="value">{{ distanceText }}</view>
      </view>
      <view class="stat-card">
        <view class="label">精度误差 (m)</view>
        <view class="value highlight">
          <text>{{ accuracyText }}</text>
          <view class="status-indicator"></view>
        </view>
      </view>
    </view>

    <view v-if="debugText" class="debug-panel">
      <text class="debug-title">定位调试</text>
      <text class="debug-text">{{ debugText }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  gpsStatusText: {
    type: String,
    default: 'GPS 连接中',
  },
  coordinateText: {
    type: String,
    default: '等待定位',
  },
  altitudeText: {
    type: String,
    default: '--',
  },
  distanceText: {
    type: String,
    default: '--',
  },
  accuracyText: {
    type: String,
    default: '--',
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
  modeText: {
    type: String,
    default: '',
  },
  debugText: {
    type: String,
    default: '',
  },
})
</script>

<style scoped lang="scss">
.header-panel {
  padding: 20rpx 30rpx;
  background: rgba(28, 28, 30, 0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  gap: 20rpx;
}

.coordinates {
  text-align: right;
}

.meta-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}

.mode-badge {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 149, 0, 0.14);
  color: #ffb457;
  border: 1px solid rgba(255, 149, 0, 0.28);
  font-size: 18rpx;
}

.gps-status {
  display: flex;
  align-items: center;

  .dot {
    width: 12rpx;
    height: 12rpx;
    background-color: #34c759;
    border-radius: 50%;
    margin-right: 10rpx;
    box-shadow: 0 0 10rpx #34c759;
  }

  .dot.offline {
    background-color: #ff9500;
    box-shadow: 0 0 10rpx #ff9500;
  }
}

.stats-grid {
  display: flex;
  justify-content: space-between;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 20rpx;
  border-radius: 20rpx;
  margin: 0 8rpx;

  .label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 10rpx;
  }

  .value {
    font-size: 48rpx;
    font-weight: 700;

    &.highlight {
      color: #34c759;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }
}

.status-indicator {
  width: 12rpx;
  height: 12rpx;
  background: #34c759;
  border-radius: 50%;
}

.debug-panel {
  margin-top: 20rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(255, 149, 0, 0.08);
  border: 1px solid rgba(255, 149, 0, 0.18);
}

.debug-title,
.debug-text {
  display: block;
}

.debug-title {
  font-size: 20rpx;
  color: #ffb457;
  margin-bottom: 8rpx;
}

.debug-text {
  font-size: 20rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}
</style>
