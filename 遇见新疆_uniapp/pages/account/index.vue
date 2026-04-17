<template>
  <view class="page-shell">
    <view class="page-scroll">
      <!-- Hero Banner -->
      <view class="hero-gradient profile-banner section">
        <view v-if="isLoggedIn" class="settings-btn" @tap="goSettings">
          <text class="settings-icon">⚙</text>
        </view>
        <view class="profile-row">
          <view class="avatar-wrap" @tap="isLoggedIn && chooseAvatar()">
            <image v-if="avatarUrl" :src="avatarUrl" class="avatar-img" mode="aspectFill" />
            <view v-else class="avatar">{{ profileInitial }}</view>
            <view v-if="isLoggedIn" class="avatar-edit-badge">编辑</view>
          </view>
          <view class="profile-meta">
            <view class="profile-name-row">
              <text class="profile-name">{{ profileName }}</text>
              <view v-if="isLoggedIn" class="name-edit-btn" @tap="openEditModal">
                <text class="name-edit-icon">✎</text>
              </view>
            </view>
            <text class="profile-email">{{ profileEmail }}</text>
          </view>
        </view>
        <view v-if="!isLoggedIn" class="guest-actions">
          <view class="hero-action primary" @tap="goAuth('login')">去登录</view>
          <view class="hero-action secondary" @tap="goAuth('register')">去注册</view>
        </view>
      </view>

      <!-- Stats -->
      <view class="section stats-shell">
        <view class="card stats-grid">
          <view v-for="item in profileStats" :key="item.label" class="stat-item">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 我的攻略 -->
      <view v-if="isLoggedIn" class="section section-block">
        <text class="section-title">我的攻略</text>
        <view v-if="myGuidesLoading" class="card guide-empty">
          <text class="muted-text">加载中...</text>
        </view>
        <view v-else-if="myGuides.length === 0" class="card guide-empty">
          <text class="muted-text">还没有发布过攻略</text>
        </view>
        <view v-else class="guide-list">
          <view v-for="g in myGuides" :key="g.id" class="card guide-item" @tap="goGuide(g.id)">
            <image v-if="g.image" :src="g.image" class="guide-thumb" mode="aspectFill" />
            <view class="guide-info">
              <text class="guide-title">{{ g.title }}</text>
              <text class="guide-meta muted-text">{{ g.category }} · {{ g.publishDate }}</text>
            </view>
            <text class="saved-arrow">></text>
          </view>
        </view>
      </view>

      <view v-if="isLoggedIn" class="section section-block">
        <text class="section-title">我的收藏</text>
        <view v-if="favoriteGuidesLoading" class="card guide-empty">
          <text class="muted-text">加载中...</text>
        </view>
        <view v-else-if="favoriteGuides.length === 0" class="card guide-empty">
          <text class="muted-text">还没有收藏任何攻略</text>
        </view>
        <view v-else class="guide-list">
          <view v-for="g in favoriteGuides" :key="g.id" class="card guide-item" @tap="goGuide(g.id)">
            <image v-if="g.image" :src="g.image" class="guide-thumb" mode="aspectFill" />
            <view class="guide-info">
              <text class="guide-title">{{ g.title }}</text>
              <text class="guide-meta muted-text">{{ g.nickname || g.author }} · {{ g.publishDate }}</text>
            </view>
            <text class="saved-arrow">></text>
          </view>
        </view>
      </view>

      <view v-else class="section section-block">
        <text class="section-title">登录后可用</text>
        <view class="card guest-card">
          <text class="guest-title">同步你的新疆旅行档案</text>
          <text class="guest-desc muted-text">登录后可查看发布的攻略、行程和云端数据。</text>
          <view class="guest-inline-actions">
            <view class="inline-btn" @tap="goAuth('login')">登录账号</view>
            <view class="inline-btn ghost" @tap="goAuth('register')">注册新账号</view>
          </view>
        </view>
      </view>

      <view class="section app-info">
        <text class="muted-text">遇见新疆 v1.0.0</text>
        <text class="muted-text">© 2026 遇见新疆，保留所有权利</text>
      </view>
      <view class="bottom-space"></view>
    </view>

    <!-- 编辑资料弹窗 -->
    <view v-if="editModalVisible" class="modal-mask" @tap.self="editModalVisible = false">
      <view class="modal-box">
        <text class="modal-title">修改资料</text>
        <view class="modal-field">
          <text class="modal-label">昵称</text>
          <input class="modal-input" v-model="editNickname" placeholder="请输入昵称" maxlength="20" />
        </view>

        <view class="modal-actions">
          <view class="modal-btn ghost" @tap="editModalVisible = false">取消</view>
          <view class="modal-btn primary" @tap="saveProfile">保存</view>
        </view>
      </view>
    </view>

    <AppTabBar current="/pages/account/index" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import { clearAuthSession, getStoredAuthToken, getStoredAuthUser, saveAuthSession } from '../../common/auth-storage'
import { getMyFavoriteGuides, getMyGuides, getMyStats, updateUserProfile, uploadAvatar } from '../../services/auth'

const currentUser = ref(null)
const authToken = ref('')
const myGuides = ref([])
const myGuidesLoading = ref(false)
const favoriteGuides = ref([])
const favoriteGuidesLoading = ref(false)
const accountStats = ref({
  guideCount: 0,
  favoriteCount: 0,
  visitedCount: 0,
  interactionCount: 0,
})
const editModalVisible = ref(false)
const editNickname = ref('')

const isLoggedIn = computed(() => Boolean(authToken.value && currentUser.value))
const profileName = computed(() => currentUser.value?.nickname || '新疆漫游者')
const profileEmail = computed(() => currentUser.value?.email || '登录后同步收藏与行程')
const avatarUrl = computed(() => currentUser.value?.avatar_url || '')
const profileInitial = computed(() => profileName.value.slice(0, 2))

const profileStats = computed(() => isLoggedIn.value
  ? [
      { value: String(accountStats.value.guideCount), label: '我的攻略' },
      { value: String(accountStats.value.favoriteCount), label: '云端收藏' },
      { value: String(accountStats.value.visitedCount), label: '已去过' },
      { value: String(accountStats.value.interactionCount), label: '互动数' },
    ]
  : [
      { value: '0', label: '云端收藏' },
      { value: '0', label: '同步行程' },
      { value: '0', label: '账号消息' },
    ]
)

onShow(() => {
  loadAuthState()
})

function loadAuthState() {
  authToken.value = getStoredAuthToken()
  currentUser.value = getStoredAuthUser()
  if (isLoggedIn.value) {
    loadMyStats()
    loadMyGuides()
    loadFavoriteGuides()
    return
  }

  myGuides.value = []
  favoriteGuides.value = []
  accountStats.value = {
    guideCount: 0,
    favoriteCount: 0,
    visitedCount: 0,
    interactionCount: 0,
  }
}

async function loadMyStats() {
  try {
    const res = await getMyStats(authToken.value)
    accountStats.value = {
      guideCount: Number(res?.data?.guideCount) || 0,
      favoriteCount: Number(res?.data?.favoriteCount) || 0,
      visitedCount: Number(res?.data?.visitedCount) || 0,
      interactionCount: Number(res?.data?.interactionCount) || 0,
    }
  } catch {
    accountStats.value = {
      guideCount: myGuides.value.length,
      favoriteCount: favoriteGuides.value.length,
      visitedCount: 0,
      interactionCount: myGuides.value.length + favoriteGuides.value.length,
    }
  }
}

async function loadMyGuides() {
  myGuidesLoading.value = true
  try {
    const res = await getMyGuides(authToken.value)
    myGuides.value = res.list || []
    accountStats.value = {
      ...accountStats.value,
      guideCount: myGuides.value.length,
      interactionCount: myGuides.value.length + accountStats.value.favoriteCount,
    }
  } catch {
    myGuides.value = []
    accountStats.value = {
      ...accountStats.value,
      guideCount: 0,
      interactionCount: accountStats.value.favoriteCount,
    }
  } finally {
    myGuidesLoading.value = false
  }
}

async function loadFavoriteGuides() {
  favoriteGuidesLoading.value = true
  try {
    const res = await getMyFavoriteGuides(authToken.value)
    favoriteGuides.value = res.list || []
    accountStats.value = {
      ...accountStats.value,
      favoriteCount: favoriteGuides.value.length,
      interactionCount: accountStats.value.guideCount + favoriteGuides.value.length,
    }
  } catch {
    favoriteGuides.value = []
    accountStats.value = {
      ...accountStats.value,
      favoriteCount: 0,
      interactionCount: accountStats.value.guideCount,
    }
  } finally {
    favoriteGuidesLoading.value = false
  }
}

function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async ({ tempFilePaths }) => {
      try {
        uni.showLoading({ title: '上传中...' })
        const res = await uploadAvatar(authToken.value, tempFilePaths[0])
        const fullUrl = res.avatar_url.startsWith('http') ? res.avatar_url : `https://111.20.31.227:34144${res.avatar_url}`
        const updated = { ...currentUser.value, avatar_url: fullUrl }
        saveAuthSession({ token: authToken.value, user: updated })
        currentUser.value = updated
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  })
}

function openEditModal() {
  editNickname.value = currentUser.value?.nickname || ''
  editModalVisible.value = true
}

async function saveProfile() {
  const nickname = editNickname.value.trim()
  if (!nickname) { editModalVisible.value = false; return }
  const payload = { nickname }
  if (nickname === currentUser.value?.nickname) { editModalVisible.value = false; return }

  try {
    const res = await updateUserProfile(authToken.value, payload)
    saveAuthSession({ token: authToken.value, user: res.user })
    currentUser.value = res.user
    editModalVisible.value = false
    uni.showToast({ title: '资料已更新', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '更新失败', icon: 'none' })
  }
}

function goGuide(slug) {
  uni.navigateTo({ url: `/pages/guide-detail/index?id=${slug}` })
}

function goAuth(mode = 'login') {
  uni.navigateTo({ url: `/pages/auth/index?mode=${mode}` })
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.profile-banner {
  padding-top: 88rpx;
  padding-bottom: 120rpx;
  color: #ffffff;
  position: relative;
}

.settings-btn {
  position: absolute;
  top: 88rpx;
  right: 32rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-icon {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.9);
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.name-edit-btn {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name-edit-icon {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.32);
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

.avatar-edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 10rpx;
  border-radius: 20rpx;
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

.guide-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.guide-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  gap: 20rpx;
}

.guide-thumb {
  width: 100rpx;
  height: 72rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.guide-info {
  flex: 1;
}

.guide-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $theme-text;
}

.guide-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
}

.guide-empty {
  margin-top: 24rpx;
  padding: 40rpx;
  text-align: center;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-left,
.menu-right {
  display: flex;
  align-items: center;
}

.menu-left {
  gap: 20rpx;
}

.menu-right {
  gap: 14rpx;
}

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

.menu-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.menu-value {
  font-size: 24rpx;
}

.menu-divider {
  height: 2rpx;
  background: rgba(196, 69, 54, 0.12);
}

.logout-button {
  display: flex;
  align-items: center;
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

/* 编辑资料弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.modal-box {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx 60rpx;
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $theme-text;
  margin-bottom: 40rpx;
}

.modal-field {
  margin-bottom: 32rpx;
}

.modal-label {
  display: block;
  font-size: 24rpx;
  color: $theme-muted;
  margin-bottom: 12rpx;
}

.modal-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid rgba(196, 69, 54, 0.2);
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.modal-btn.primary {
  background: $theme-color;
  color: #fff;
}

.modal-btn.ghost {
  border: 2rpx solid rgba(196, 69, 54, 0.2);
  color: $theme-color;
}
</style>
