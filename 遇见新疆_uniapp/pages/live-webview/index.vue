<template>
  <view class="webview-page">
    <view class="header hero-gradient">
      <view class="header-inner">
        <view class="back-btn" @tap="goBack">返回</view>
        <text class="title">{{ pageTitle }}</text>
      </view>
    </view>
    <web-view class="webview-body" :src="pageUrl"></web-view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const page = getCurrentPages().slice(-1)[0]
const pageUrl = computed(() => decodeURIComponent(page?.options?.url || 'https://www.douyin.com'))
const pageTitle = computed(() => decodeURIComponent(page?.options?.title || '直播搜索'))

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.webview-page {
  min-height: 100vh;
  background: #faf8f5;
}

.header {
  padding-top: 48rpx;
}

.header-inner {
  height: 96rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  color: #ffffff;
}

.back-btn {
  min-width: 96rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 600;
}

.webview-body {
  height: calc(100vh - 144rpx);
}
</style>
