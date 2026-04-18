<template>
  <view class="page-shell">
    <view class="page-scroll">
      <!-- 自定义导航栏 -->
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <text class="nav-back-icon">‹</text>
        </view>
        <text class="nav-title">设置</text>
        <view class="nav-placeholder"></view>
      </view>

      <!-- 修改昵称（仅登录后显示） -->
      <view v-if="isLoggedIn" class="section section-block">
        <text class="section-title">账号信息</text>
        <view class="card menu-card">
          <view class="menu-wrap">
            <view class="menu-item" @tap="openEditModal">
              <view class="menu-left">
                <view class="menu-icon">昵</view>
                <text class="menu-label">修改昵称</text>
              </view>
              <view class="menu-right">
                <text class="menu-value muted-text">{{ profileName }}</text>
                <text class="saved-arrow">></text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 账户设置 -->
      <view class="section section-block">
        <text class="section-title">账户设置</text>
        <view class="card menu-card">
          <view v-for="(item, index) in menuItems" :key="item.label" class="menu-wrap">
            <view class="menu-item" @tap="item.action && item.action()">
              <view class="menu-left">
                <view class="menu-icon">{{ item.short }}</view>
                <text class="menu-label">{{ item.label }}</text>
              </view>
              <view class="menu-right">
                <text v-if="item.value" class="menu-value muted-text">{{ item.value }}</text>
                <text class="saved-arrow">></text>
              </view>
            </view>
            <view v-if="index < menuItems.length - 1" class="menu-divider"></view>
          </view>
        </view>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="section section-block">
        <view class="logout-button" @tap="handleLogout">退出登录</view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <!-- 编辑昵称弹窗 -->
    <view v-if="editModalVisible" class="modal-mask" @tap.self="editModalVisible = false">
      <view class="modal-box">
        <text class="modal-title">修改昵称</text>
        <view class="modal-field">
          <input class="modal-input" v-model="editNickname" placeholder="请输入昵称" maxlength="20" />
        </view>
        <view class="modal-actions">
          <view class="modal-btn ghost" @tap="editModalVisible = false">取消</view>
          <view class="modal-btn primary" @tap="saveProfile">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { clearAuthSession, getStoredAuthToken, getStoredAuthUser, saveAuthSession } from '../../common/auth-storage'
import { updateUserProfile } from '../../services/auth'

const currentUser = ref(null)
const authToken = ref('')
const editModalVisible = ref(false)
const editNickname = ref('')

const isLoggedIn = computed(() => Boolean(authToken.value && currentUser.value))
const profileName = computed(() => currentUser.value?.nickname || '新疆漫游者')

const menuItems = [
  { short: '行', label: '旅行足迹' },
  { short: '消', label: '消息通知' },
  { short: '语', label: '语言设置', value: '简体中文' },
  { short: '设', label: '通用设置' },
]

onShow(() => {
  authToken.value = getStoredAuthToken()
  currentUser.value = getStoredAuthUser()
})

function goBack() {
  uni.navigateBack()
}

function openEditModal() {
  editNickname.value = currentUser.value?.nickname || ''
  editModalVisible.value = true
}

async function saveProfile() {
  const nickname = editNickname.value.trim()
  if (!nickname || nickname === currentUser.value?.nickname) {
    editModalVisible.value = false
    return
  }
  try {
    const res = await updateUserProfile(authToken.value, { nickname })
    const merged = { ...currentUser.value, ...res.user, avatar_url: currentUser.value?.avatar_url || res.user?.avatar_url }
    saveAuthSession({ token: authToken.value, user: merged })
    currentUser.value = merged
    editModalVisible.value = false
    uni.showToast({ title: '昵称已更新', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '更新失败', icon: 'none' })
  }
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号吗？',
    success: ({ confirm }) => {
      if (!confirm) return
      clearAuthSession()
      uni.showToast({ title: '已退出登录', icon: 'none' })
      uni.navigateBack()
    },
  })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 32rpx 24rpx;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
}

.nav-back-icon {
  font-size: 56rpx;
  color: $theme-text;
  line-height: 1;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $theme-text;
}

.nav-placeholder {
  width: 64rpx;
}

.section-block {
  margin-top: 40rpx;
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

.menu-left, .menu-right {
  display: flex;
  align-items: center;
}

.menu-left { gap: 20rpx; }
.menu-right { gap: 14rpx; }

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

.saved-arrow {
  color: $theme-muted;
  font-size: 30rpx;
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
