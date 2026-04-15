<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient profile-banner section">
        <view class="profile-row">
          <view class="avatar">疆游</view>
          <view class="profile-meta">
            <text class="profile-name">新疆漫游者</text>
            <text class="profile-email">explorer@meetxinjiang.com</text>
          </view>
        </view>
      </view>

      <view class="section stats-shell">
        <view class="card stats-grid">
          <view v-for="item in profileStats" :key="item.label" class="stat-item">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">最近收藏</text>
        <view class="saved-list">
          <view v-for="item in savedDestinations" :key="item.id" class="card saved-item">
            <view class="saved-left">
              <view class="saved-icon">SV</view>
              <view>
                <text class="saved-name">{{ item.name }}</text>
                <text class="saved-date muted-text">{{ item.date }}</text>
              </view>
            </view>
            <text class="saved-arrow">></text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">账户设置</text>
        <view class="card menu-card">
          <view v-for="(item, index) in menuItems" :key="item.label" class="menu-wrap">
            <view class="menu-item">
              <view class="menu-left">
                <view class="menu-icon">{{ item.short }}</view>
                <text class="menu-label">{{ item.label }}</text>
              </view>
              <view class="menu-right">
                <text v-if="item.count !== undefined" class="count-pill">{{ item.count }}</text>
                <text v-if="item.value" class="menu-value muted-text">{{ item.value }}</text>
                <text class="saved-arrow">></text>
              </view>
            </view>
            <view v-if="index < menuItems.length - 1" class="menu-divider"></view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="logout-button">退出登录</view>
      </view>

      <view class="section app-info">
        <text class="muted-text">遇见新疆 v1.0.0</text>
        <text class="muted-text">© 2026 遇见新疆，保留所有权利</text>
      </view>

      <view class="bottom-space"></view>
    </view>

    <AppTabBar current="/pages/account/index" />
  </view>
</template>

<script setup>
import AppTabBar from '../../components/AppTabBar.vue'

const profileStats = [
  { value: '12', label: '已去过' },
  { value: '8', label: '已收藏' },
  { value: '24', label: '点评数' },
]

const savedDestinations = [
  { id: 1, name: '天池', date: '2 天前收藏' },
  { id: 2, name: '喀什古城', date: '1 周前收藏' },
  { id: 3, name: '喀纳斯', date: '2 周前收藏' },
]

const menuItems = [
  { short: '藏', label: '我的收藏', count: 3 },
  { short: '行', label: '旅行足迹', count: 5 },
  { short: '消', label: '消息通知', count: 3 },
  { short: '语', label: '语言设置', value: '简体中文' },
  { short: '设', label: '通用设置' },
]
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.profile-banner {
  padding-top: 88rpx;
  padding-bottom: 120rpx;
  color: #ffffff;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 700;
}

.profile-meta {
  display: flex;
  flex-direction: column;
}

.profile-name {
  font-size: 42rpx;
  font-weight: 700;
}

.profile-email {
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.82;
}

.stats-shell {
  margin-top: -52rpx;
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
  display: block;
  color: $theme-color;
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $theme-muted;
}

.section-block {
  margin-top: 40rpx;
}

.saved-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.saved-item,
.menu-item,
.logout-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.saved-item {
  padding: 24rpx;
}

.saved-left,
.menu-left,
.menu-right {
  display: flex;
  align-items: center;
}

.saved-left,
.menu-left {
  gap: 20rpx;
}

.saved-icon,
.menu-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.saved-name,
.menu-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.saved-date {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
}

.saved-arrow {
  color: $theme-muted;
  font-size: 30rpx;
}

.menu-card {
  margin-top: 24rpx;
  overflow: hidden;
}

.menu-wrap {
  padding: 0 24rpx;
}

.menu-item {
  min-height: 108rpx;
}

.menu-right {
  gap: 14rpx;
}

.count-pill {
  min-width: 44rpx;
  height: 44rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
}

.menu-value {
  font-size: 24rpx;
}

.menu-divider {
  height: 2rpx;
  background: rgba(196, 69, 54, 0.12);
}

.logout-button {
  justify-content: center;
  padding: 28rpx;
  border-radius: 28rpx;
  border: 2rpx solid rgba(196, 69, 54, 0.15);
  background: #ffffff;
  color: $theme-color;
  font-size: 30rpx;
  font-weight: 600;
}

.app-info {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  font-size: 22rpx;
}
</style>
