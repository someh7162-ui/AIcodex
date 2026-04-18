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
  { path: '/pages/home/index', label: '首页' },
  { path: '/pages/destinations/index', label: '目的地' },
  { path: '/pages/guides/index', label: '攻略指南' },
  { path: '/pages/account/index', label: '我的' },
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
  padding: 14rpx 16rpx;
  border-radius: 32rpx;
}

.tab-item {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18rpx 0;
  color: $theme-muted;
}

.tab-item.active {
  color: $theme-color;
}

.tab-label {
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
}
</style>
