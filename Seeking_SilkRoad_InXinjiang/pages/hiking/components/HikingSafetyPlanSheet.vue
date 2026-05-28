<template>
  <view v-if="visible" class="sheet-mask" @tap="emit('close')">
    <view class="sheet-panel" @tap.stop>
      <view class="sheet-header">
        <view>
          <text class="sheet-title">安全报备</text>
          <text class="sheet-subtitle">保存联系人与预计返程时间；徒步页运行期间，逾期会提醒你报平安或发出 SOS。</text>
        </view>
        <view class="close-btn" @tap="emit('close')">关闭</view>
      </view>

      <view v-if="status.active" class="active-status" :class="`status-${status.level}`">
        <text class="active-label">当前报备</text>
        <text class="active-text">{{ status.statusText }}</text>
      </view>

      <view class="form-field">
        <text class="field-label">紧急联系人</text>
        <input
          class="field-input"
          :value="form.contactName"
          placeholder="例如：家人 / 同行队友"
          maxlength="24"
          @input="updateField('contactName', $event)"
        />
      </view>

      <view class="phone-row">
        <view class="form-field phone-field">
          <text class="field-label">主要电话</text>
          <input
            class="field-input"
            :value="form.primaryPhone"
            type="text"
            placeholder="必填"
            maxlength="24"
            @input="updateField('primaryPhone', $event)"
          />
        </view>
        <view class="form-field phone-field">
          <text class="field-label">备用电话</text>
          <input
            class="field-input"
            :value="form.backupPhone"
            type="text"
            placeholder="选填"
            maxlength="24"
            @input="updateField('backupPhone', $event)"
          />
        </view>
      </view>

      <view class="form-field">
        <text class="field-label">路线说明</text>
        <input
          class="field-input"
          :value="form.routeNote"
          placeholder="例如：喀纳斯观鱼台往返"
          maxlength="60"
          @input="updateField('routeNote', $event)"
        />
      </view>

      <view class="form-field">
        <text class="field-label">预计多久后返程</text>
        <view class="duration-row">
          <view
            v-for="option in durationOptions"
            :key="option.value"
            class="duration-chip"
            :class="{ active: form.durationMinutes === option.value }"
            @tap="form.durationMinutes = option.value"
          >
            {{ option.label }}
          </view>
        </view>
      </view>

      <view class="action-row">
        <view class="primary-action" @tap="submitPlan">{{ status.active ? '重新计时' : '启用报备' }}</view>
        <view v-if="status.active" class="safe-action" @tap="emit('complete')">我已安全返程</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  plan: {
    type: Object,
    default: () => ({}),
  },
  status: {
    type: Object,
    default: () => ({ active: false, level: 'idle', statusText: '' }),
  },
})

const emit = defineEmits(['close', 'save', 'complete'])
const durationOptions = [
  { label: '1 小时', value: 60 },
  { label: '2 小时', value: 120 },
  { label: '4 小时', value: 240 },
  { label: '8 小时', value: 480 },
]
const form = reactive({
  contactName: '',
  primaryPhone: '',
  backupPhone: '',
  routeNote: '',
  durationMinutes: 120,
})

watch(
  () => [props.visible, props.plan],
  ([visible]) => {
    if (!visible) {
      return
    }

    form.contactName = String(props.plan?.contactName || '')
    form.primaryPhone = String(props.plan?.primaryPhone || '')
    form.backupPhone = String(props.plan?.backupPhone || '')
    form.routeNote = String(props.plan?.routeNote || '')
    form.durationMinutes = Number(props.plan?.durationMinutes || 120)
  },
  { immediate: true, deep: true }
)

function updateField(key, event) {
  form[key] = String(event?.detail?.value || '')
}

function submitPlan() {
  emit('save', { ...form })
}
</script>

<style scoped lang="scss">
.sheet-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.54);
}

.sheet-panel {
  width: 100%;
  padding: 28rpx 30rpx calc(34rpx + env(safe-area-inset-bottom));
  border-radius: 34rpx 34rpx 0 0;
  background: #15171c;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.sheet-title,
.sheet-subtitle,
.field-label,
.active-label,
.active-text {
  display: block;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}

.sheet-subtitle {
  margin-top: 8rpx;
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

.active-status {
  margin-bottom: 22rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(52, 199, 89, 0.12);
  border: 1px solid rgba(52, 199, 89, 0.26);
}

.active-status.status-warning {
  background: rgba(255, 149, 0, 0.12);
  border-color: rgba(255, 149, 0, 0.28);
}

.active-status.status-danger {
  background: rgba(255, 69, 58, 0.13);
  border-color: rgba(255, 69, 58, 0.3);
}

.active-label {
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.54);
}

.active-text {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #fff;
}

.form-field {
  margin-top: 16rpx;
}

.field-label {
  margin-bottom: 9rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.62);
}

.field-input {
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 25rpx;
}

.phone-row,
.duration-row,
.action-row {
  display: flex;
  gap: 14rpx;
}

.phone-field {
  flex: 1;
  min-width: 0;
}

.duration-chip {
  flex: 1;
  padding: 17rpx 8rpx;
  border-radius: 16rpx;
  text-align: center;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.76);
  background: rgba(255, 255, 255, 0.06);
}

.duration-chip.active {
  color: #fff;
  background: rgba(10, 132, 255, 0.3);
  border: 1px solid rgba(10, 132, 255, 0.5);
}

.action-row {
  margin-top: 28rpx;
}

.primary-action,
.safe-action {
  flex: 1;
  padding: 21rpx 12rpx;
  border-radius: 20rpx;
  text-align: center;
  font-size: 25rpx;
  font-weight: 700;
}

.primary-action {
  color: #fff;
  background: #0a84ff;
}

.safe-action {
  color: #baffca;
  background: rgba(52, 199, 89, 0.16);
}
</style>
