<template>
  <view class="page-shell auth-page">
    <view class="page-scroll">
      <view class="hero-gradient auth-banner section">
        <text class="auth-kicker">Account Center</text>
        <text class="auth-title">登录 / 注册</text>
        <text class="auth-subtitle">先把账号体系接好，后续只需要填服务器地址和 PostgreSQL 配置就能连起来。</text>
      </view>

      <view class="section auth-panel-shell">
        <view class="card auth-card">
          <view class="mode-switch">
            <view class="mode-pill" :class="{ active: mode === 'login' }" @tap="mode = 'login'">登录</view>
            <view class="mode-pill" :class="{ active: mode === 'register' }" @tap="mode = 'register'">注册</view>
          </view>

          <view class="field-list">
            <view v-if="mode === 'register'" class="field-wrap">
              <text class="field-label">昵称</text>
              <input v-model.trim="form.nickname" class="field-input" placeholder="输入昵称" />
            </view>

            <view class="field-wrap">
              <text class="field-label">邮箱</text>
              <input v-model.trim="form.email" class="field-input" type="text" placeholder="输入邮箱" />
            </view>

            <view class="field-wrap">
              <text class="field-label">密码</text>
              <input v-model.trim="form.password" password class="field-input" placeholder="输入密码" />
            </view>

            <view v-if="mode === 'register'" class="field-wrap">
              <text class="field-label">确认密码</text>
              <input v-model.trim="form.confirmPassword" password class="field-input" placeholder="再次输入密码" />
            </view>
          </view>

          <view v-if="errorMessage" class="error-banner">
            <text>{{ errorMessage }}</text>
          </view>

          <view class="submit-btn" :class="{ disabled: submitting }" @tap="submitAuth">
            {{ submitting ? '提交中...' : mode === 'login' ? '立即登录' : '创建账号' }}
          </view>

          <text class="auth-note muted-text">接口已预留，后续把认证服务地址填到 `config/auth.js` 即可联调。</text>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">当前预留接口</text>
        <view class="card reserve-card">
          <view class="reserve-row">
            <text class="reserve-tag">POST</text>
            <text class="reserve-path">/auth/register</text>
          </view>
          <text class="reserve-desc muted-text">注册账号，建议返回 `token`、`user`。</text>
          <view class="reserve-row second">
            <text class="reserve-tag">POST</text>
            <text class="reserve-path">/auth/login</text>
          </view>
          <text class="reserve-desc muted-text">邮箱 + 密码登录，建议返回 `token`、`user`。</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginWithPassword, registerWithPassword } from '../../services/auth'
import { saveAuthSession } from '../../common/auth-storage'

const mode = ref('login')
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})

onLoad((options = {}) => {
  if (options.mode === 'register') {
    mode.value = 'register'
  }
})

async function submitAuth() {
  if (submitting.value) {
    return
  }

  const validationMessage = validateForm()
  if (validationMessage) {
    errorMessage.value = validationMessage
    return
  }

  submitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      email: form.email,
      password: form.password,
    }

    if (mode.value === 'register') {
      payload.nickname = form.nickname
    }

    const response = mode.value === 'login'
      ? await loginWithPassword(payload)
      : await registerWithPassword(payload)

    const token = response?.token || ''
    const user = response?.user || {
      nickname: form.nickname || '新疆新用户',
      email: form.email,
    }

    saveAuthSession({ token, user })

    uni.showToast({
      title: mode.value === 'login' ? '登录成功' : '注册成功',
      icon: 'none',
    })

    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
        return
      }

      uni.redirectTo({
        url: '/pages/account/index',
      })
    }, 500)
  } catch (error) {
    errorMessage.value = error.message || '提交失败，请稍后再试。'
  } finally {
    submitting.value = false
  }
}

function validateForm() {
  if (mode.value === 'register' && !form.nickname) {
    return '请输入昵称。'
  }

  if (!form.email) {
    return '请输入邮箱。'
  }

  if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    return '请输入正确的邮箱格式。'
  }

  if (!form.password || form.password.length < 6) {
    return '密码至少 6 位。'
  }

  if (mode.value === 'register' && form.password !== form.confirmPassword) {
    return '两次输入的密码不一致。'
  }

  return ''
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.auth-page {
  background: $theme-bg;
}

.auth-banner {
  padding-top: 110rpx;
  padding-bottom: 96rpx;
  color: #ffffff;
}

.auth-kicker {
  font-size: 22rpx;
  letter-spacing: 3rpx;
  text-transform: uppercase;
  opacity: 0.82;
}

.auth-title {
  display: block;
  margin-top: 18rpx;
  font-size: 52rpx;
  font-weight: 700;
}

.auth-subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.8;
  opacity: 0.92;
}

.auth-panel-shell {
  margin-top: -46rpx;
}

.auth-card {
  padding: 28rpx;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  padding: 10rpx;
  border-radius: 28rpx;
  background: rgba(196, 69, 54, 0.08);
}

.mode-pill {
  min-height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $theme-muted;
  font-size: 26rpx;
  font-weight: 600;
}

.mode-pill.active {
  background: #ffffff;
  color: $theme-color;
}

.field-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 23rpx;
  color: $theme-muted;
}

.field-input {
  width: 100%;
  min-height: 92rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f5efe8;
  font-size: 26rpx;
  color: $theme-text;
}

.error-banner {
  margin-top: 22rpx;
  padding: 20rpx 22rpx;
  border-radius: 22rpx;
  background: rgba(196, 69, 54, 0.1);
  color: $theme-color;
  font-size: 24rpx;
  line-height: 1.7;
}

.submit-btn {
  margin-top: 24rpx;
  min-height: 92rpx;
  border-radius: 26rpx;
  background: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
}

.submit-btn.disabled {
  opacity: 0.72;
}

.auth-note {
  display: block;
  margin-top: 18rpx;
  font-size: 22rpx;
  line-height: 1.7;
}

.section-block {
  margin-top: 40rpx;
}

.reserve-card {
  margin-top: 22rpx;
  padding: 26rpx;
}

.reserve-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.reserve-row.second {
  margin-top: 24rpx;
}

.reserve-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.1);
  color: $theme-color;
  font-size: 21rpx;
  font-weight: 700;
}

.reserve-path {
  font-size: 27rpx;
  font-weight: 600;
  color: $theme-text;
}

.reserve-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 23rpx;
  line-height: 1.7;
}
</style>
