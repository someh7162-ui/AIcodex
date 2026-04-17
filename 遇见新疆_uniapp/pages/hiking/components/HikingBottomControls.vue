<template>
  <view class="bottom-controls">
    <view class="handle-bar"></view>

    <view class="button-group">
      <view class="side-action">
        <view class="btn-circle sos" @tap="$emit('sos')">
          <text class="btn-text">SOS</text>
        </view>
        <text class="label">SOS</text>
      </view>

      <view class="main-action">
        <view class="btn-circle start" @tap="$emit('toggle-track')">
          <text class="btn-text">{{ isTracking ? '暂停' : '开始' }}</text>
        </view>
      </view>

      <view class="side-action">
        <view class="btn-circle shield" :class="{ active: isGuardMode }" @tap="$emit('toggle-guard')">
          <text class="icon"></text>
        </view>
        <text class="label">守护模式</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  isTracking: {
    type: Boolean,
    default: false,
  },
  isGuardMode: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['sos', 'toggle-track', 'toggle-guard'])
</script>

<style scoped lang="scss">
.bottom-controls {
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 40rpx 60rpx;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: -30rpx;
  z-index: 20;
}

.handle-bar {
  width: 80rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4rpx;
  margin: 0 auto 40rpx;
}

.button-group {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.side-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;

  .label {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.5);
  }
}

.btn-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.92);
    opacity: 0.8;
  }
}

.sos {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #ff453a, #c62828);
  box-shadow: 0 10rpx 30rpx rgba(255, 69, 58, 0.3);

  .btn-text {
    font-weight: 800;
    font-size: 32rpx;
  }
}

.start {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #ff9500, #ff7000);
  box-shadow: 0 15rpx 40rpx rgba(255, 149, 0, 0.4);

  .btn-text {
    font-weight: 800;
    font-size: 40rpx;
  }
}

.shield {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #0a84ff, #0056b3);
  box-shadow: 0 10rpx 30rpx rgba(10, 132, 255, 0.3);

  .icon {
    font-size: 50rpx;
  }
}

.shield.active {
  box-shadow: 0 0 0 6rpx rgba(10, 132, 255, 0.2), 0 10rpx 30rpx rgba(10, 132, 255, 0.35);
}
</style>
