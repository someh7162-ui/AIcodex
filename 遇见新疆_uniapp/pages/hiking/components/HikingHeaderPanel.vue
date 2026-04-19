<template>
  <view class="header-panel">
    <view v-if="sunsetCountdownText" class="sunset-banner" :class="`risk-${sunsetRiskLevel}`">
      <text class="sunset-title">日落时间</text>
      <text class="sunset-countdown">{{ sunsetCountdownText }}</text>
      <text v-if="sunsetTimeText" class="sunset-meta">{{ sunsetTimeText }}</text>
    </view>

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

    <view v-if="guardStatusText" class="guard-banner" :class="`guard-${guardStatusLevel}`">
      <text class="guard-title">守护模式</text>
      <text class="guard-text">{{ guardStatusText }}</text>
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
  sunsetCountdownText: {
    type: String,
    default: '',
  },
  sunsetTimeText: {
    type: String,
    default: '',
  },
  sunsetRiskLevel: {
    type: String,
    default: 'safe',
  },
  guardStatusText: {
    type: String,
    default: '',
  },
  guardStatusLevel: {
    type: String,
    default: 'safe',
  },
})
</script>

<style scoped lang="scss">
.header-panel {
  padding: 12rpx 18rpx 14rpx;
  background: rgba(28, 28, 30, 0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.sunset-banner {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  border: 1px solid rgba(255, 196, 107, 0.28);
  background: linear-gradient(135deg, rgba(78, 45, 17, 0.92), rgba(37, 21, 10, 0.92));
}

.sunset-banner.risk-warning {
  border-color: rgba(255, 159, 67, 0.45);
  background: linear-gradient(135deg, rgba(104, 47, 13, 0.94), rgba(55, 23, 10, 0.94));
}

.sunset-banner.risk-danger,
.sunset-banner.risk-passed {
  border-color: rgba(255, 91, 91, 0.5);
  background: linear-gradient(135deg, rgba(115, 26, 26, 0.95), rgba(63, 14, 14, 0.95));
}

.sunset-title,
.sunset-countdown,
.sunset-meta {
  display: block;
}

.sunset-title {
  flex-shrink: 0;
  font-size: 18rpx;
  color: rgba(255, 224, 178, 0.86);
  letter-spacing: 1rpx;
}

.sunset-countdown {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #fff4df;
}

.sunset-meta {
  flex-shrink: 0;
  font-size: 18rpx;
  color: rgba(255, 238, 213, 0.74);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  gap: 12rpx;
}

.guard-banner {
  margin-bottom: 12rpx;
  padding: 10rpx 14rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
}

.guard-banner.guard-warning,
.guard-banner.guard-danger {
  background: rgba(255, 149, 0, 0.11);
  border-color: rgba(255, 149, 0, 0.22);
}

.guard-title,
.guard-text {
  display: block;
}

.guard-title {
  flex-shrink: 0;
  font-size: 18rpx;
  color: rgba(194, 255, 207, 0.86);
}

.guard-banner.guard-warning .guard-title,
.guard-banner.guard-danger .guard-title {
  color: rgba(255, 206, 133, 0.92);
}

.guard-text {
  flex: 1;
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.84);
}

.coordinates {
  text-align: right;
}

.meta-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.mode-badge {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 149, 0, 0.14);
  color: #ffb457;
  border: 1px solid rgba(255, 149, 0, 0.28);
  font-size: 16rpx;
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
  gap: 8rpx;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 14rpx 12rpx;
  border-radius: 16rpx;
  margin: 0;

  .label {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8rpx;
  }

  .value {
    font-size: 34rpx;
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
  width: 10rpx;
  height: 10rpx;
  background: #34c759;
  border-radius: 50%;
}

@media (max-width: 420px) {
  .sunset-banner {
    padding: 10rpx 12rpx;
    gap: 8rpx;
  }

  .sunset-title,
  .sunset-meta {
    font-size: 16rpx;
  }

  .sunset-countdown {
    font-size: 22rpx;
  }

  .coordinates {
    font-size: 18rpx;
  }

  .guard-title,
  .guard-text {
    font-size: 16rpx;
  }

  .stat-card .value {
    font-size: 30rpx;
  }
}
</style>
