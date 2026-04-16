<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient profile-banner section">
        <view class="profile-row">
          <view class="avatar">{{ profileInitial }}</view>
          <view class="profile-meta">
            <text class="profile-name">{{ profileName }}</text>
            <text class="profile-email">{{ profileEmail }}</text>
          </view>
        </view>

        <view v-if="!isLoggedIn" class="guest-actions">
          <view class="hero-action primary" @tap="goAuth('login')">去登录</view>
          <view class="hero-action secondary" @tap="goAuth('register')">去注册</view>
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

      <view v-if="isLoggedIn" class="section section-block">
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

      <view v-else class="section section-block">
        <text class="section-title">登录后可用</text>
        <view class="card guest-card">
          <text class="guest-title">同步你的新疆旅行档案</text>
          <text class="guest-desc muted-text">登录后可接入收藏、行程、通知和后续 PostgreSQL 云端数据。</text>
          <view class="guest-inline-actions">
            <view class="inline-btn" @tap="goAuth('login')">登录账号</view>
            <view class="inline-btn ghost" @tap="goAuth('register')">注册新账号</view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">账户设置</text>
        <view class="card menu-card">
          <view v-for="(item, index) in visibleMenuItems" :key="item.label" class="menu-wrap">
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
            <view v-if="index < visibleMenuItems.length - 1" class="menu-divider"></view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view
          class="logout-button"
          :class="{ disabled: !isLoggedIn }"
          @tap="handlePrimaryAction"
        >
          {{ isLoggedIn ? '退出登录' : '前往登录 / 注册' }}
        </view>
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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import {
  clearAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
} from '../../common/auth-storage'

const currentUser = ref(null)
const authToken = ref('')

const loggedInStats = [
  { value: '12', label: '已去过' },
  { value: '8', label: '已收藏' },
  { value: '24', label: '点评数' },
]

const guestStats = [
  { value: '0', label: '云端收藏' },
  { value: '0', label: '同步行程' },
  { value: '0', label: '账号消息' },
]

const savedDestinations = [
  { id: 1, name: '天池', date: '2 天前收藏' },
  { id: 2, name: '喀什古城', date: '1 周前收藏' },
  { id: 3, name: '喀纳斯', date: '2 周前收藏' },
]

const loggedInMenuItems = [
  { short: '藏', label: '我的收藏', count: 3 },
  { short: '行', label: '旅行足迹', count: 5 },
  { short: '消', label: '消息通知', count: 3 },
  { short: '语', label: '语言设置', value: '简体中文' },
  { short: '设', label: '通用设置' },
]

const guestMenuItems = [
  { short: '登', label: '登录账号', value: '同步旅行信息' },
  { short: '注', label: '注册账号', value: '预留 PostgreSQL 接口' },
  { short: '语', label: '语言设置', value: '简体中文' },
  { short: '设', label: '通用设置' },
]

const isLoggedIn = computed(() => Boolean(authToken.value || currentUser.value))
const profileStats = computed(() => (isLoggedIn.value ? loggedInStats : guestStats))
const visibleMenuItems = computed(() => (isLoggedIn.value ? loggedInMenuItems : guestMenuItems))
const profileName = computed(() => currentUser.value?.nickname || '新疆漫游者')
const profileEmail = computed(() => currentUser.value?.email || '登录后同步收藏与行程')
const profileInitial = computed(() => {
  const source = profileName.value || '疆游'
  return source.slice(0, 2)
})

onShow(() => {
  loadAuthState()
})

function loadAuthState() {
  authToken.value = getStoredAuthToken()
  currentUser.value = getStoredAuthUser()
}

function goAuth(mode = 'login') {
  uni.navigateTo({
    url: `/pages/auth/index?mode=${mode}`,
  })
}

function handlePrimaryAction() {
  if (!isLoggedIn.value) {
    goAuth('login')
    return
  }

  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号吗？本地登录态会被清除。',
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      clearAuthSession()
      loadAuthState()
      uni.showToast({
        title: '已退出登录',
        icon: 'none',
      })
    },
  })
}
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

.guest-actions {
  margin-top: 28rpx;
  display: flex;
  gap: 16rpx;
}

.hero-action,
.inline-btn {
  min-height: 76rpx;
  padding: 0 30rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.hero-action.primary,
.inline-btn {
  background: #ffffff;
  color: $theme-color;
}

.hero-action.secondary,
.inline-btn.ghost {
  border: 2rpx solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

.inline-btn.ghost {
  color: $theme-color;
  border-color: rgba(196, 69, 54, 0.18);
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

.guest-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.guest-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $theme-text;
}

.guest-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.guest-inline-actions {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
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

.logout-button.disabled {
  opacity: 0.88;
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
