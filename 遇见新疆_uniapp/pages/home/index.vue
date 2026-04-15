<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero hero-gradient">
        <view class="hero-overlay"></view>
        <view class="hero-content">
          <text class="hero-title">遇见新疆</text>
          <text class="hero-subtitle">沿着丝路风景，开启一段辽阔而热烈的旅程</text>
          <view class="hero-badge">
            <text class="hero-badge-dot"></text>
            <text class="hero-badge-text">50+ 热门目的地</text>
          </view>
        </view>
      </view>

      <view class="section stats-panel">
        <view class="stats-grid card">
          <view v-for="item in stats" :key="item.label" class="stat-item">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head">
          <text class="section-title">精选目的地</text>
          <text class="link-text" @tap="goToDestinations">查看全部</text>
        </view>

        <view class="card-list">
          <view v-for="item in featuredDestinations" :key="item.id" class="card destination-card" @tap="openDetail(item.id)">
            <view class="image-wrap">
              <CachedImage :src="item.image" image-class="cover-image" />
              <view class="rating-badge">
                <text class="rating-star">*</text>
                <text class="rating-text">{{ item.rating }}</text>
              </view>
              <view class="enter-badge">查看详情</view>
            </view>
            <view class="destination-body">
              <text class="destination-title">{{ item.name }}</text>
              <text class="destination-desc muted-text">{{ item.description }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block last-block">
        <text class="section-title">热门玩法</text>
        <view class="activity-grid">
          <view v-for="item in activities" :key="item.title" class="activity-card">
            <view class="activity-icon">{{ item.short }}</view>
            <text class="activity-title">{{ item.title }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <AppTabBar current="/pages/home/index" />
  </view>
</template>

<script setup>
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { destinationList } from '../../common/destination-data'

const stats = [
  { value: '50+', label: '景点推荐' },
  { value: '100+', label: '旅行锦囊' },
  { value: '4.8', label: '用户评分' },
]

const featuredDestinations = destinationList.slice(0, 3)

const activities = [
  { short: '丝', title: '丝路人文漫游' },
  { short: '沙', title: '沙漠越野探险' },
]

function goToDestinations() {
  uni.reLaunch({ url: '/pages/destinations/index' })
}

function openDetail(id) {
  uni.navigateTo({ url: `/pages/destination-detail/index?id=${id}` })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero {
  position: relative;
  height: 520rpx;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 58%);
}

.hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
  text-align: center;
  color: #ffffff;
}

.hero-title {
  font-size: 58rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 12rpx;
  font-size: 28rpx;
  opacity: 0.9;
}

.hero-badge {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 28rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  backdrop-filter: blur(8px);
}

.hero-badge-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ffffff;
}

.hero-badge-text {
  font-size: 24rpx;
}

.stats-panel {
  margin-top: -54rpx;
  position: relative;
  z-index: 2;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 26rpx 0;
}

.stat-item {
  text-align: center;
  border-right: 2rpx solid rgba(196, 69, 54, 0.12);
}

.stat-item:last-child {
  border-right: 0;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: $theme-color;
}

.stat-label {
  margin-top: 8rpx;
  display: block;
  color: $theme-muted;
  font-size: 22rpx;
}

.section-block {
  margin-top: 40rpx;
}

.last-block {
  padding-bottom: 28rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.link-text {
  color: $theme-color;
  font-size: 24rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.destination-card {
  overflow: hidden;
  position: relative;
}

.image-wrap {
  position: relative;
  height: 360rpx;
}

.rating-badge {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
}

.enter-badge {
  position: absolute;
  left: 20rpx;
  bottom: 20rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
  font-size: 22rpx;
}

.rating-star {
  color: #f1a20b;
  font-size: 24rpx;
  font-weight: 700;
}

.rating-text {
  color: $theme-text;
  font-size: 24rpx;
}

.destination-body {
  padding: 28rpx;
}

.destination-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.destination-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.activity-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.activity-card {
  padding: 28rpx 20rpx;
  border-radius: 28rpx;
  text-align: center;
  background: rgba(232, 168, 124, 0.18);
  border: 2rpx solid rgba(232, 168, 124, 0.4);
}

.activity-icon {
  width: 74rpx;
  height: 74rpx;
  margin: 0 auto 16rpx;
  border-radius: 24rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.activity-title {
  font-size: 24rpx;
}
</style>
