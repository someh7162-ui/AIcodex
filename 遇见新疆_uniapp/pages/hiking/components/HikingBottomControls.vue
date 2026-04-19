<template>
  <view class="bottom-controls">
    <view v-if="isSosMenuOpen" class="sos-popover-mask" @tap="closeSosMenu"></view>

    <view v-if="isSosMenuOpen" class="sos-popover">
      <view class="sos-popover-header">
        <text class="sos-popover-title">紧急呼救</text>
        <text class="sos-popover-subtitle">{{ emergencySubtitle }}</text>
      </view>

      <view class="sos-action-row">
        <view class="sos-action-card" @tap="handleFlashlightAction">
          <view class="sos-action-icon flashlight" :class="{ active: isSosFlashing }">
            <text class="icon-text">灯</text>
          </view>
          <text class="sos-action-title">手电筒求救</text>
          <text class="sos-action-desc">{{ isSosFlashing ? '点击停止 SOS 闪烁' : '按 SOS 摩斯密码循环闪烁' }}</text>
        </view>

        <view class="sos-action-card" @tap="handleSmsAction">
          <view class="sos-action-icon message">
            <text class="icon-text">信</text>
          </view>
          <text class="sos-action-title">紧急短信</text>
          <text class="sos-action-desc">发送坐标、海拔与定位信息</text>
        </view>
      </view>
    </view>

    <view class="handle-bar"></view>

    <view class="button-group">
      <view class="side-action">
        <view class="btn-circle sos" :class="{ 'is-flashing': isSosFlashing, active: isSosMenuOpen }" @tap="toggleSosMenu">
          <text class="btn-text">SOS</text>
        </view>
        <text class="label">SOS</text>
      </view>

      <view class="main-action">
        <view class="btn-circle start" @tap="emit('toggle-track')" @longpress="handleFinishLongPress">
          <text class="btn-text">{{ isTracking ? '暂停' : '开始' }}</text>
        </view>
        <text class="main-action-tip">{{ isTracking ? '长按结束并保存' : '点击开始记录' }}</text>
      </view>

      <view class="side-action">
        <view class="btn-circle shield" :class="{ active: isGuardMode }" @tap="emit('toggle-guard')">
          <text class="icon">护</text>
        </view>
        <text class="label">守护模式</text>
      </view>
    </view>

    <view class="secondary-actions">
      <view
        class="secondary-btn"
        :class="{ disabled: !hasTrackPoints && !isTracking }"
        @tap="handleClearTrack"
      >
        清空当前轨迹
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  isTracking: {
    type: Boolean,
    default: false,
  },
  hasTrackPoints: {
    type: Boolean,
    default: false,
  },
  isGuardMode: {
    type: Boolean,
    default: false,
  },
  emergencyContactName: {
    type: String,
    default: '紧急联系人',
  },
  emergencyContactPhones: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['toggle-track', 'toggle-guard', 'sos-message', 'finish-track', 'clear-track'])

const SHORT_ON_MS = 250
const LONG_ON_MS = 750
const OFF_MS = 250
const LETTER_GAP_MS = 750
const CYCLE_GAP_MS = 2000

const isSosFlashing = ref(false)
const isSosMenuOpen = ref(false)
const emergencySubtitle = computed(() => {
  const phones = props.emergencyContactPhones.join(' / ')
  return phones ? `${props.emergencyContactName} · ${phones}` : props.emergencyContactName
})

let sosLoopToken = 0

function toggleSosMenu() {
  isSosMenuOpen.value = !isSosMenuOpen.value
}

function closeSosMenu() {
  isSosMenuOpen.value = false
}

async function handleFlashlightAction() {
  await toggleSosFlash()
  closeSosMenu()
}

function handleSmsAction() {
  emit('sos-message')
  closeSosMenu()
}

function handleFinishLongPress() {
  if (!props.isTracking) {
    return
  }
  emit('finish-track')
}

function handleClearTrack() {
  if (!props.hasTrackPoints && !props.isTracking) {
    return
  }

  emit('clear-track')
}

async function toggleSosFlash() {
  if (isSosFlashing.value) {
    await stopSosFlash()
    return
  }

  const ready = await prepareTorch()
  if (!ready) {
    return
  }

  isSosFlashing.value = true
  const token = ++sosLoopToken
  runSosLoop(token)
}

async function runSosLoop(token) {
  try {
    while (isSosFlashing.value && token === sosLoopToken) {
      await playLetter([SHORT_ON_MS, SHORT_ON_MS, SHORT_ON_MS], token)
      await sleepIfActive(LETTER_GAP_MS, token)
      await playLetter([LONG_ON_MS, LONG_ON_MS, LONG_ON_MS], token)
      await sleepIfActive(LETTER_GAP_MS, token)
      await playLetter([SHORT_ON_MS, SHORT_ON_MS, SHORT_ON_MS], token)
      await sleepIfActive(CYCLE_GAP_MS, token)
    }
  } catch (error) {
    if (error?.message !== 'SOS stopped') {
      console.warn('[hiking-sos]', error?.message || error)
    }
  } finally {
    if (token === sosLoopToken) {
      isSosFlashing.value = false
    }
    setTorchEnabled(false)
  }
}

async function playLetter(pattern, token) {
  for (let index = 0; index < pattern.length; index += 1) {
    await flashPulse(pattern[index], token)
  }
}

async function flashPulse(onDuration, token) {
  ensureActive(token)
  setTorchEnabled(true)
  await sleepIfActive(onDuration, token)
  setTorchEnabled(false)
  await sleepIfActive(OFF_MS, token)
}

async function stopSosFlash() {
  sosLoopToken += 1
  isSosFlashing.value = false
  setTorchEnabled(false)
}

async function prepareTorch() {
  // #ifdef APP-PLUS
  if (typeof plus === 'undefined' || !plus.android) {
    return false
  }
  if (plus.os?.name !== 'Android') {
    uni.showToast({
      title: '当前仅支持 Android 手电筒 SOS',
      icon: 'none',
    })
    return false
  }

  try {
    const cameraManager = getCameraManager()
    const cameraId = getPrimaryCameraId(cameraManager)
    if (!cameraManager || !cameraId) {
      uni.showToast({
        title: '未找到可用闪光灯',
        icon: 'none',
      })
      return false
    }
    return true
  } catch (error) {
    console.warn('[hiking-sos] prepare torch failed', error?.message || error)
    uni.showToast({
      title: '手电筒不可用，请检查权限或摄像头占用',
      icon: 'none',
      duration: 2500,
    })
    return false
  }
  // #endif

  return false
}

function ensureActive(token) {
  if (!isSosFlashing.value || token !== sosLoopToken) {
    throw new Error('SOS stopped')
  }
}

async function sleepIfActive(duration, token) {
  ensureActive(token)
  await sleep(duration)
  ensureActive(token)
}

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

function setTorchEnabled(enabled) {
  // #ifdef APP-PLUS
  if (typeof plus === 'undefined' || !plus.android || plus.os?.name !== 'Android') {
    return
  }

  try {
    const cameraManager = getCameraManager()
    const cameraId = getPrimaryCameraId(cameraManager)
    if (!cameraManager || !cameraId) {
      return
    }
    cameraManager.setTorchMode(cameraId, Boolean(enabled))
  } catch (error) {
    console.warn('[hiking-sos] set torch failed', error?.message || error)
  }
  // #endif
}

function getCameraManager() {
  // #ifdef APP-PLUS
  const main = plus.android.runtimeMainActivity()
  const Context = plus.android.importClass('android.content.Context')
  const cameraManager = main.getSystemService(Context.CAMERA_SERVICE)
  if (cameraManager) {
    plus.android.importClass(cameraManager)
  }
  return cameraManager || null
  // #endif

  return null
}

function getPrimaryCameraId(cameraManager) {
  // #ifdef APP-PLUS
  if (!cameraManager) {
    return ''
  }
  const cameraIds = cameraManager.getCameraIdList()
  const primaryId = cameraIds && cameraIds.length ? cameraIds[0] : ''
  return primaryId ? String(primaryId) : ''
  // #endif

  return ''
}

onBeforeUnmount(() => {
  closeSosMenu()
  stopSosFlash()
})
</script>

<style scoped lang="scss">
.bottom-controls {
  position: relative;
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 40rpx 60rpx;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: -30rpx;
  z-index: 20;
}

.sos-popover-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 420rpx;
  z-index: 18;
}

.sos-popover {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(100% - 12rpx);
  z-index: 19;
  padding: 26rpx;
  border-radius: 32rpx;
  background: rgba(12, 13, 16, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.4);
}

.sos-popover-header {
  margin-bottom: 24rpx;
}

.sos-popover-title,
.sos-popover-subtitle,
.sos-action-title,
.sos-action-desc {
  display: block;
}

.sos-popover-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #fff;
}

.sos-popover-subtitle {
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.62);
}

.sos-action-row {
  display: flex;
  gap: 20rpx;
}

.sos-action-card {
  flex: 1;
  min-height: 228rpx;
  padding: 24rpx 20rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.sos-action-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.2);
}

.sos-action-icon.flashlight {
  background: linear-gradient(135deg, #ffb240, #ff7a00);
}

.sos-action-icon.flashlight.active {
  animation: sosPulse 1.2s ease-in-out infinite;
}

.sos-action-icon.message {
  background: linear-gradient(135deg, #4da3ff, #0a84ff);
}

.icon-text {
  font-size: 34rpx;
  font-weight: 800;
  color: #fff;
}

.sos-action-title {
  margin-top: 18rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.sos-action-desc {
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.65);
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

.secondary-actions {
  display: flex;
  justify-content: center;
  margin-top: 24rpx;
}

.secondary-btn {
  min-width: 240rpx;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.secondary-btn.disabled {
  opacity: 0.42;
}

.main-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.main-action-tip {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.56);
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

.sos.active,
.sos.is-flashing {
  box-shadow: 0 0 0 8rpx rgba(255, 69, 58, 0.18), 0 12rpx 36rpx rgba(255, 69, 58, 0.45);
}

.sos.is-flashing {
  animation: sosPulse 1.2s ease-in-out infinite;
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
    color: #fff;
    font-weight: 700;
    line-height: 1;
  }
}

.shield.active {
  box-shadow: 0 0 0 6rpx rgba(10, 132, 255, 0.2), 0 10rpx 30rpx rgba(10, 132, 255, 0.35);
}

@keyframes sosPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.86;
  }
}
</style>
