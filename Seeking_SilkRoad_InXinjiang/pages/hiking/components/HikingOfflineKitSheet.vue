<template>
  <view v-if="visible" class="kit-mask" @tap="emit('close')">
    <view class="kit-panel" @tap.stop>
      <view class="kit-header">
        <view>
          <text class="kit-title">离线安全包</text>
          <text class="kit-subtitle">无信号时可查看最近位置、报备信息、底图状态和出发检查。</text>
        </view>
        <view class="close-btn" @tap="emit('close')">关闭</view>
      </view>

      <view class="readiness-card" :class="{ ready: readiness.allReady }">
        <view>
          <text class="readiness-label">离网准备度</text>
          <text class="readiness-value">{{ readiness.readyCount }}/{{ readiness.totalCount }}</text>
        </view>
        <view class="readiness-bar">
          <view class="readiness-fill" :style="{ width: readinessPercent }"></view>
        </view>
      </view>

      <view class="status-list">
        <view
          v-for="item in readiness.checks"
          :key="item.id"
          class="status-row"
          :class="{ ready: item.ready }"
        >
          <view class="status-dot">{{ item.ready ? '✓' : '!' }}</view>
          <view class="status-copy">
            <text class="status-title">{{ item.title }}</text>
            <text class="status-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">最近快照</text>
          <text class="section-meta">{{ updatedAtText }}</text>
        </view>

        <view class="snapshot-grid">
          <view class="snapshot-item wide">
            <text class="snapshot-label">坐标</text>
            <text class="snapshot-value">{{ coordinateText }}</text>
          </view>
          <view class="snapshot-item">
            <text class="snapshot-label">海拔</text>
            <text class="snapshot-value">{{ altitudeText }}</text>
          </view>
          <view class="snapshot-item">
            <text class="snapshot-label">精度</text>
            <text class="snapshot-value">{{ accuracyText }}</text>
          </view>
          <view class="snapshot-item">
            <text class="snapshot-label">轨迹</text>
            <text class="snapshot-value">{{ trackText }}</text>
          </view>
          <view class="snapshot-item">
            <text class="snapshot-label">底图</text>
            <text class="snapshot-value">{{ offlineMapText }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">安全报备</text>
        <view class="plan-box">
          <text class="plan-line">{{ contactText }}</text>
          <text class="plan-line">{{ routeText }}</text>
          <text class="plan-line">{{ returnText }}</text>
        </view>
      </view>

      <view class="section checklist-section">
        <view class="section-head">
          <text class="section-title">出发检查</text>
          <text class="section-meta">{{ readiness.checklistDone }}/{{ readiness.checklistTotal }}</text>
        </view>
        <view
          v-for="item in checklistItems"
          :key="item.id"
          class="check-row"
          :class="{ checked: checklist[item.id] }"
          @tap="emit('toggle-check', item.id, !checklist[item.id])"
        >
          <view class="check-box">{{ checklist[item.id] ? '✓' : '' }}</view>
          <view class="check-copy">
            <text class="check-title">{{ item.title }}</text>
            <text class="check-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="action-grid">
        <view class="action-btn primary" @tap="emit('refresh')">保存当前快照</view>
        <view class="action-btn" @tap="emit('copy')">复制安全卡</view>
        <view class="action-btn" @tap="emit('open-safety-plan')">安全报备</view>
        <view class="action-btn" @tap="emit('offline-pack-action')">离线底图</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { DEFAULT_OFFLINE_CHECKLIST, formatOfflineKitTime } from '../../../common/hiking-offline-kit'
import { formatCoordinate } from '../../../common/hiking-metrics'
import { formatSafetyPlanTime } from '../../../common/hiking-safety-plan'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  kit: {
    type: Object,
    default: () => ({}),
  },
  readiness: {
    type: Object,
    default: () => ({
      checks: [],
      readyCount: 0,
      totalCount: 5,
      checklistDone: 0,
      checklistTotal: DEFAULT_OFFLINE_CHECKLIST.length,
      allReady: false,
    }),
  },
})

const emit = defineEmits(['close', 'refresh', 'copy', 'toggle-check', 'open-safety-plan', 'offline-pack-action'])

const checklistItems = DEFAULT_OFFLINE_CHECKLIST
const snapshot = computed(() => props.kit?.snapshot || {})
const checklist = computed(() => props.kit?.checklist || {})
const readinessPercent = computed(() => {
  const total = Math.max(1, Number(props.readiness?.totalCount || 1))
  const ready = Math.max(0, Number(props.readiness?.readyCount || 0))
  return `${Math.min(100, Math.round((ready / total) * 100))}%`
})
const updatedAtText = computed(() => formatOfflineKitTime(snapshot.value.updatedAt || props.kit?.updatedAt))
const coordinateText = computed(() => {
  const location = snapshot.value.location
  if (!location) {
    return '暂无坐标'
  }
  return `${formatCoordinate(location.latitude, 'lat')}, ${formatCoordinate(location.longitude, 'lng')}`
})
const altitudeText = computed(() => formatNumberMetric(snapshot.value.location?.altitude, 'm'))
const accuracyText = computed(() => formatNumberMetric(snapshot.value.location?.accuracy, 'm'))
const trackText = computed(() => {
  const track = snapshot.value.track || {}
  return `${Number(track.pointCount || 0)} 点 · ${Number(track.distanceKm || 0).toFixed(2)} km`
})
const offlineMapText = computed(() => {
  const pack = snapshot.value.offlinePack || {}
  return pack.status === 'ready' ? '已准备' : '未准备'
})
const contactText = computed(() => {
  const plan = snapshot.value.safetyPlan || {}
  if (!plan.primaryPhone) {
    return '联系人：未配置'
  }
  return `联系人：${plan.contactName || '未命名'} ${plan.primaryPhone}`
})
const routeText = computed(() => {
  const route = snapshot.value.safetyPlan?.routeNote
  return route ? `路线：${route}` : '路线：未填写'
})
const returnText = computed(() => {
  const plan = snapshot.value.safetyPlan || {}
  return plan.expectedReturnAt ? `预计返程：${formatSafetyPlanTime(plan.expectedReturnAt)}` : '预计返程：未启用'
})

function formatNumberMetric(value, unit) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '--'
  }
  return `${Math.round(number)}${unit}`
}
</script>

<style scoped lang="scss">
.kit-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 62;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.58);
}

.kit-panel {
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  padding: 28rpx 30rpx calc(34rpx + env(safe-area-inset-bottom));
  border-radius: 34rpx 34rpx 0 0;
  background: #111417;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.kit-header,
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  align-items: flex-start;
}

.kit-title,
.kit-subtitle,
.readiness-label,
.readiness-value,
.status-title,
.status-desc,
.section-title,
.section-meta,
.snapshot-label,
.snapshot-value,
.plan-line,
.check-title,
.check-desc {
  display: block;
}

.kit-title {
  font-size: 34rpx;
  font-weight: 800;
}

.kit-subtitle {
  margin-top: 8rpx;
  max-width: 540rpx;
  font-size: 21rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.62);
}

.close-btn {
  flex-shrink: 0;
  padding: 10rpx 16rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.readiness-card {
  margin-top: 24rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 149, 0, 0.12);
  border: 1px solid rgba(255, 149, 0, 0.24);
}

.readiness-card.ready {
  background: rgba(52, 199, 89, 0.12);
  border-color: rgba(52, 199, 89, 0.28);
}

.readiness-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.62);
}

.readiness-value {
  margin-top: 4rpx;
  font-size: 38rpx;
  font-weight: 800;
}

.readiness-bar {
  height: 10rpx;
  margin-top: 16rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.readiness-fill {
  height: 100%;
  border-radius: inherit;
  background: #34c759;
  transition: width 0.2s ease;
}

.status-list {
  margin-top: 16rpx;
  display: grid;
  gap: 12rpx;
}

.status-row,
.check-row {
  display: flex;
  gap: 14rpx;
  align-items: center;
  padding: 16rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-row.ready,
.check-row.checked {
  border-color: rgba(52, 199, 89, 0.24);
  background: rgba(52, 199, 89, 0.09);
}

.status-dot,
.check-box {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
  color: #fff;
  background: rgba(255, 149, 0, 0.8);
}

.status-row.ready .status-dot,
.check-row.checked .check-box {
  background: #34c759;
}

.status-copy,
.check-copy {
  min-width: 0;
  flex: 1;
}

.status-title,
.check-title {
  font-size: 24rpx;
  font-weight: 700;
}

.status-desc,
.check-desc {
  margin-top: 4rpx;
  font-size: 20rpx;
  line-height: 1.42;
  color: rgba(255, 255, 255, 0.58);
}

.section {
  margin-top: 24rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 760;
}

.section-meta {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.54);
}

.snapshot-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.snapshot-item {
  min-height: 100rpx;
  padding: 16rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.06);
}

.snapshot-item.wide {
  grid-column: span 2;
}

.snapshot-label {
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.52);
}

.snapshot-value {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.35;
  font-weight: 700;
  word-break: break-all;
}

.plan-box {
  margin-top: 14rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.06);
}

.plan-line {
  font-size: 22rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

.checklist-section {
  padding-bottom: 8rpx;
}

.check-row {
  margin-top: 12rpx;
}

.check-box {
  background: rgba(255, 255, 255, 0.12);
}

.action-grid {
  position: sticky;
  bottom: 0;
  margin-top: 26rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  padding-top: 12rpx;
  background: linear-gradient(180deg, rgba(17, 20, 23, 0), #111417 18rpx);
}

.action-btn {
  height: 74rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.09);
}

.action-btn.primary {
  background: linear-gradient(135deg, #24c26a, #149b55);
}
</style>
