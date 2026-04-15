<template>
  <view class="tabbar-wrap">
    <view class="tabbar card">
      <view
        v-for="item in items"
        :key="item.path"
        class="tab-item"
        :class="{ active: current === item.path }"
        @tap="go(item.path)"
      >
        <view class="tab-icon">{{ item.short }}</view>
        <text class="tab-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  current: {
    type: String,
    required: true,
  },
})

const items = [
  { path: '/pages/home/index', label: '首页', short: 'H' },
  { path: '/pages/destinations/index', label: '目的地', short: 'D' },
  { path: '/pages/guides/index', label: '指南', short: 'G' },
  { path: '/pages/account/index', label: '我的', short: 'A' },
]

function go(path) {
  if (props.current === path) {
    return
  }
  uni.reLaunch({ url: path })
}
</script>

<style scoped lang="scss">
@import '../uni.scss';

.tabbar-wrap {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  z-index: 20;
}

.tabbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 18rpx;
  border-radius: 32rpx;
}

.tab-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 10rpx 0;
  color: $theme-muted;
}

.tab-item.active {
  color: $theme-color;
}

.tab-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 165, 116, 0.16);
  font-size: 24rpx;
  font-weight: 700;
}

.tab-item.active .tab-icon {
  background: $theme-color;
  color: #ffffff;
}

.tab-label {
  font-size: 22rpx;
}
</style>
