<template>
  <view class="publish-page">
    <view class="status-space" :style="statusBarStyle"></view>

    <view class="topbar">
      <view class="topbar-btn" @tap="goBack">返回</view>
      <text class="topbar-title">发布笔记</text>
      <button class="topbar-btn submit-btn" :class="{ disabled: publishSubmitting }" :disabled="publishSubmitting" @tap="submitPublishedGuide">
        {{ publishSubmitting ? '发布中' : '发布' }}
      </button>
    </view>

    <scroll-view class="page-body" scroll-y>
      <view class="composer-card">
        <view class="composer-head">
          <image class="composer-avatar" :src="authorAvatar" mode="aspectFill"></image>
          <view class="composer-user-copy">
            <text class="composer-name">{{ currentUser?.nickname || '新疆旅行者' }}</text>
            <text class="composer-subline">分享一条会被收藏的新疆笔记</text>
          </view>
        </view>
        <view class="composer-stats-row">
          <view class="composer-stat-chip">{{ derivedContentType }}</view>
          <view class="composer-stat-chip">{{ derivedSubCategory }}</view>
          <view class="composer-stat-chip">{{ locationTagText }}</view>
          <view class="composer-stat-chip">{{ mediaSummary }}</view>
        </view>
      </view>

      <view class="form-card">
        <view class="section-head">
          <text class="field-label no-gap">标题</text>
          <text class="section-tip">一句话说清这条内容值不值得点开</text>
        </view>
        <input
          v-model="publishForm.title"
          class="native-input"
          type="text"
          maxlength="36"
          placeholder="比如：喀什古城一晚怎么逛最舒服"
          placeholder-class="placeholder-text"
          confirm-type="done"
          :focus="autoFocusTitle"
          always-embed
          cursor-spacing="24"
        />
      </view>

      <view class="form-card">
        <view class="section-head">
          <text class="field-label no-gap">简短描述</text>
          <text class="section-tip">不用写很长，1-2 句话就够</text>
        </view>
        <textarea
          v-model="publishForm.excerpt"
          class="native-textarea"
          maxlength="80"
          placeholder="写一点氛围、路线提醒或你的真实体验。"
          placeholder-class="placeholder-text"
          auto-height
          fixed="false"
          cursor-spacing="24"
          always-embed
        ></textarea>
      </view>

      <view class="form-card">
        <view class="section-head">
          <text class="field-label no-gap">标签</text>
          <text class="section-tip">用逗号分隔，后面会自动参与搜索</text>
        </view>
        <input
          v-model="publishForm.tagText"
          class="native-input"
          type="text"
          maxlength="50"
          placeholder="比如：夜市, 拍照, 喀什, 徒步"
          placeholder-class="placeholder-text"
          confirm-type="done"
          always-embed
          cursor-spacing="24"
        />
      </view>

      <view class="form-card media-card">
        <view class="media-icon-row">
          <view class="media-icon-btn" @tap="pickMedia">
            <text class="media-icon-symbol">+</text>
          </view>
        </view>

        <view v-if="publishForm.videoPoster" class="video-card">
          <image class="video-poster" :src="publishForm.videoPoster" mode="aspectFill"></image>
          <view class="video-overlay">视频</view>
          <view class="video-remove" @tap="removePublishVideo">×</view>
        </view>

        <view v-if="publishForm.images.length" class="image-grid">
          <view v-for="(item, index) in publishForm.images" :key="`${item}-${index}`" class="image-item">
            <image class="image-thumb" :src="item" mode="aspectFill"></image>
            <view class="image-badge">{{ index === 0 ? '封面' : `图 ${index + 1}` }}</view>
            <view class="image-remove" @tap="removePublishImage(index)">×</view>
          </view>
        </view>
      </view>

      <view class="form-card location-card">
        <view class="section-head">
          <text class="field-label no-gap">发布定位</text>
          <text class="section-tip">可像微信一样选择附近区域再发布</text>
        </view>
        <view class="location-row">
          <view class="location-pill" :class="locationStatusClass">{{ locationStatusText }}</view>
          <text class="location-copy">{{ locationTagText }}</text>
        </view>
        <view class="location-actions">
          <view class="location-action-btn" @tap="reloadCurrentLocation">重新定位</view>
          <view class="location-action-btn strong" @tap="openLocationPicker">选择附近位置</view>
        </view>
      </view>

      <view v-if="publishError" class="error-banner">{{ publishError }}</view>

      <view class="bottom-submit-wrap">
        <button class="bottom-submit-btn" :class="{ disabled: publishSubmitting }" :disabled="publishSubmitting" @tap="submitPublishedGuide">
          {{ publishSubmitting ? '发布中...' : '发布到发现页' }}
        </button>
      </view>
      <view class="page-bottom-space"></view>
    </scroll-view>

    <view v-if="showLocationPicker" class="location-picker-mask" @tap="closeLocationPicker">
      <view class="location-picker-panel" @tap.stop>
        <view class="location-picker-head">
          <view>
            <text class="location-picker-title">选择附近位置</text>
            <text class="location-picker-subtitle">发布时会带上你选中的附近区域</text>
          </view>
          <view class="location-picker-close" @tap="closeLocationPicker">×</view>
        </view>

        <view v-if="locationOptionsLoading" class="location-picker-state">正在获取附近位置...</view>
        <view v-else-if="!locationOptions.length" class="location-picker-state">暂时没有可选位置，先重新定位试试。</view>
        <scroll-view v-else class="location-option-list" scroll-y>
          <view
            v-for="item in locationOptions"
            :key="item.value"
            class="location-option"
            :class="{ active: publishForm.locationTag === item.value }"
            @tap="selectLocationOption(item)"
          >
            <view>
              <text class="location-option-label">{{ item.label }}</text>
              <text class="location-option-meta">{{ locationSourceText(item.source) }}</text>
            </view>
            <text v-if="publishForm.locationTag === item.value" class="location-option-check">已选</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStoredAuthToken, getStoredAuthUser } from '../../common/auth-storage'
import { addPublishedGuide, defaultCoverOptions, persistGuideImages, persistLocalFile } from '../../common/published-guides'
import { getCurrentLocation, getNearbyLocationOptions, reverseGeocode } from '../../services/amap'
import { createGuide, hasGuideApi, uploadGuideMedia } from '../../services/guides'

const publishSubmitting = ref(false)
const publishError = ref('')
const autoFocusTitle = ref(false)
const locating = ref(false)
const locationFailed = ref(false)
const showLocationPicker = ref(false)
const locationOptionsLoading = ref(false)
const locationOptions = ref([])
const publishForm = reactive(createDefaultPublishForm())

const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : {}
const statusBarHeight = systemInfo.statusBarHeight || 20
const statusBarStyle = computed(() => ({ height: `${statusBarHeight}px` }))
const currentUser = computed(() => getStoredAuthUser() || null)

const authorAvatar = computed(() => currentUser.value?.avatar_url || currentUser.value?.avatar || defaultCoverOptions[1])
const derivedContentType = computed(() => {
  if (publishForm.video) {
    return '视频'
  }
  if (publishForm.images.length) {
    return '图文'
  }
  return '文字'
})
const derivedSubCategory = computed(() => inferSubCategory({
  title: publishForm.title,
  excerpt: publishForm.excerpt,
  tagText: publishForm.tagText,
  contentType: derivedContentType.value,
}))
const locationTagText = computed(() => publishForm.locationTag || '新疆同城')
const mediaSummary = computed(() => {
  if (publishForm.video) {
    return '1 个视频'
  }
  if (publishForm.images.length) {
    return `${publishForm.images.length} 张图片`
  }
  return '文字卡片'
})
const locationStatusText = computed(() => {
  if (locating.value) {
    return '定位中'
  }
  if (locationFailed.value) {
    return '定位失败'
  }
  return publishForm.locationTag ? '已定位' : '待定位'
})
const locationStatusClass = computed(() => ({
  active: !locating.value && !locationFailed.value,
  warn: locationFailed.value,
}))

onLoad(() => {
  if (!currentUser.value) {
    uni.showModal({
      title: '先登录再发布',
      content: '发布功能会使用当前登录昵称回流到信息流，先去登录页完成账号登录。',
      showCancel: false,
      success: () => {
        uni.redirectTo({ url: '/pages/auth/index?mode=login' })
      },
    })
    return
  }

  loadCurrentLocation()
  setTimeout(() => {
    autoFocusTitle.value = true
  }, 50)
})

function createDefaultPublishForm() {
  return {
    title: '',
    excerpt: '',
    tagText: '',
    locationTag: '',
    locationLatitude: null,
    locationLongitude: null,
    images: [],
    video: '',
    videoPoster: '',
  }
}

async function loadCurrentLocation() {
  locating.value = true
  locationFailed.value = false

  try {
    const coords = await getCurrentLocation()
    const regeo = await reverseGeocode(coords.longitude, coords.latitude)
    const address = regeo?.addressComponent || {}
    const city = normalizeLocationPart(address.city)
    const district = normalizeLocationPart(address.district)
    const province = normalizeLocationPart(address.province)
    publishForm.locationLongitude = coords.longitude
    publishForm.locationLatitude = coords.latitude
    publishForm.locationTag = formatLocationTag(city || province, district) || '新疆同城'
    await loadNearbyLocationOptions(coords)
  } catch (error) {
    publishForm.locationTag = '新疆同城'
    publishForm.locationLongitude = null
    publishForm.locationLatitude = null
    locationOptions.value = []
    locationFailed.value = true
  } finally {
    locating.value = false
  }
}

function normalizeLocationPart(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return String(value || '').trim()
}

function formatLocationTag(city, area) {
  return [city, area].filter(Boolean).join(' ')
}

async function loadNearbyLocationOptions(coords) {
  if (!coords?.longitude || !coords?.latitude) {
    locationOptions.value = []
    return
  }

  locationOptionsLoading.value = true
  try {
    const options = await getNearbyLocationOptions(coords.longitude, coords.latitude)
    locationOptions.value = options
    if (!publishForm.locationTag && options.length) {
      publishForm.locationTag = options[0].value
    }
  } catch (error) {
    locationOptions.value = []
  } finally {
    locationOptionsLoading.value = false
  }
}

async function reloadCurrentLocation() {
  if (locating.value || publishSubmitting.value) {
    return
  }
  await loadCurrentLocation()
}

async function openLocationPicker() {
  if (!publishForm.locationLongitude || !publishForm.locationLatitude) {
    await loadCurrentLocation()
  }
  showLocationPicker.value = true
}

function closeLocationPicker() {
  showLocationPicker.value = false
}

function selectLocationOption(option) {
  publishForm.locationTag = option?.value || publishForm.locationTag
  closeLocationPicker()
}

function locationSourceText(source) {
  if (source === 'poi') return '附近地点'
  if (source === 'business') return '附近商圈'
  if (source === 'aoi') return '附近区域'
  if (source === 'district') return '当前城区'
  return '定位结果'
}

function inferSubCategory({ title = '', excerpt = '', tagText = '', contentType = '' } = {}) {
  const combinedText = [title, excerpt, tagText, contentType].join(' ').toLowerCase()
  const rules = [
    { category: '自驾', keywords: ['自驾', '包车', '租车', '公路', '驾驶', '停车', '里程', 'roadtrip'] },
    { category: '美食', keywords: ['美食', '抓饭', '拌面', '烤肉', '夜市', '奶茶', '餐厅', '咖啡', '好吃'] },
    { category: '安全', keywords: ['安全', '避坑', '提醒', '注意', '证件', '防晒', '限速', '边防', '风险'] },
    { category: '徒步', keywords: ['徒步', '登山', '露营', ' hike', 'trail', '营地', '穿越', '步道'] },
    { category: '住宿', keywords: ['住宿', '民宿', '酒店', '客栈', '房间', '住哪', '入住', '青旅'] },
  ]

  const matchedRule = rules.find((rule) => rule.keywords.some((keyword) => combinedText.includes(keyword)))
  return matchedRule?.category || '推荐'
}

function mapCategoryName(subCategory) {
  const categoryMap = {
    自驾: '自驾建议',
    美食: '吃喝推荐',
    安全: '安全提醒',
    徒步: '户外探险',
    住宿: '住宿建议',
  }

  return categoryMap[subCategory] || '旅行分享'
}

function goBack() {
  if (publishSubmitting.value) {
    return
  }
  uni.navigateBack()
}

function removePublishImage(index) {
  if (index < 0 || index >= publishForm.images.length) {
    return
  }
  publishForm.images.splice(index, 1)
}

function removePublishVideo() {
  publishForm.video = ''
  publishForm.videoPoster = ''
}

function pickMedia() {
  uni.showActionSheet({
    itemList: ['添加图片', '添加视频'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) pickPublishImages()
      else pickPublishVideo()
    },
  })
}

function pickPublishImages() {
  const remainCount = 9 - publishForm.images.length
  if (remainCount <= 0) {
    return
  }

  uni.chooseImage({
    count: remainCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const pickedPaths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : []
      publishForm.images = [...new Set([...publishForm.images, ...pickedPaths])].slice(0, 9)
      if (publishForm.video) {
        removePublishVideo()
      }
    },
  })
}

function pickPublishVideo() {
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    maxDuration: 60,
    compressed: true,
    success: (res) => {
      publishForm.video = res.tempFilePath || ''
      publishForm.videoPoster = res.thumbTempFilePath || ''
      if (publishForm.images.length) {
        publishForm.images = []
      }
    },
  })
}

async function submitPublishedGuide() {
  if (publishSubmitting.value) {
    return
  }

  const validationMessage = validatePublishedGuide()
  if (validationMessage) {
    publishError.value = validationMessage
    return
  }

  publishSubmitting.value = true
  publishError.value = ''

  try {
    const highlights = publishForm.tagText
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6)

    const token = getStoredAuthToken()
    const useRemoteApi = hasGuideApi() && Boolean(token)
    const savedImages = useRemoteApi
      ? await Promise.all(publishForm.images.map((item) => uploadGuideMedia(item, 'image', token).then((res) => res.url || '')))
      : await persistGuideImages(publishForm.images)
    const savedVideo = publishForm.video
      ? (useRemoteApi
          ? (await uploadGuideMedia(publishForm.video, 'video', token)).url || ''
          : await persistLocalFile(publishForm.video))
      : ''
    const savedVideoPoster = publishForm.videoPoster
      ? (useRemoteApi
          ? (await uploadGuideMedia(publishForm.videoPoster, 'image', token)).url || ''
          : await persistLocalFile(publishForm.videoPoster))
      : ''

    const contentType = savedVideo ? '视频' : (savedImages.length ? '图文' : '文字')
    const subCategory = inferSubCategory({
      title: publishForm.title,
      excerpt: publishForm.excerpt,
      tagText: publishForm.tagText,
      contentType,
    })
    const summaryText = publishForm.excerpt.trim() || (highlights.length ? `#${highlights.join(' #')}` : '来自新疆旅途中的一条真实笔记。')
    const guidePayload = {
      title: publishForm.title.trim(),
      excerpt: summaryText,
      summary: summaryText,
      summaryText,
      category: mapCategoryName(subCategory),
      subCategory,
      contentType,
      location: locationTagText.value,
      locationTag: locationTagText.value,
      image: savedImages[0] || savedVideoPoster || '',
      images: savedImages,
      video: savedVideo,
      videoPoster: savedVideoPoster,
      readTime: '2 分钟阅读',
      views: '0',
      likes: '0',
      highlights,
      tips: highlights.length ? highlights.map((item) => `标签：${item}`) : [],
      sections: summaryText ? [{ title: '笔记内容', paragraphs: [summaryText] }] : [],
      coverAspectRatio: savedVideo ? 1.45 : (savedImages.length ? 1.34 : 0.84),
      primaryTab: '发现',
      cityTab: '同城',
    }

    const createdGuide = useRemoteApi
      ? await createGuide(guidePayload, token)
      : addPublishedGuide(guidePayload, currentUser.value || {})

    uni.showToast({ title: '发布成功', icon: 'none' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/guide-detail/index?id=${encodeURIComponent(createdGuide?.id || '')}` })
    }, 200)
  } catch (error) {
    publishError.value = error.message || '发布失败，请稍后再试。'
  } finally {
    publishSubmitting.value = false
  }
}

function validatePublishedGuide() {
  if (!publishForm.title.trim() || publishForm.title.trim().length < 4) {
    return '标题至少写 4 个字。'
  }
  if (!publishForm.excerpt.trim() && !publishForm.tagText.trim() && !publishForm.images.length && !publishForm.video) {
    return '至少补一句描述、几个标签，或者上传媒体内容。'
  }
  return ''
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.publish-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff8f4 0%, #fffdfb 36%, #f8f4ee 100%);
}

.status-space {
  width: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 24rpx;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 2rpx solid rgba(15, 23, 42, 0.05);
}

.topbar-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: $theme-text;
}

.topbar-btn,
.media-action-btn,
.bottom-submit-btn {
  border: none;
}

.topbar-btn::after,
.media-action-btn::after,
.bottom-submit-btn::after {
  border: none;
}

.topbar-btn {
  min-width: 96rpx;
  height: 64rpx;
  padding: 0 16rpx;
  border-radius: 18rpx;
  background: #f7f7f8;
  color: $theme-text;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  line-height: 1;
}

.submit-btn,
.bottom-submit-btn {
  background: linear-gradient(135deg, #ff5f5f, #ff7c62);
  color: #ffffff;
}

.submit-btn.disabled,
.bottom-submit-btn.disabled {
  opacity: 0.65;
}

.page-body {
  height: calc(100vh - 120rpx - env(safe-area-inset-top));
  padding: 24rpx 24rpx 40rpx;
}

.composer-card,
.form-card,
.error-banner {
  margin-top: 20rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 2rpx solid rgba(15, 23, 42, 0.04);
  border-radius: 28rpx;
  padding: 24rpx;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.05);
}

.composer-head {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.composer-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #f3f4f6;
  flex-shrink: 0;
}

.composer-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $theme-text;
}

.composer-subline {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: $theme-muted;
}

.composer-stats-row,
.chip-row,
.media-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.composer-stats-row {
  margin-top: 20rpx;
}

.composer-stat-chip,
.location-pill {
  height: 52rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #fff1ec;
  color: #df5c46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21rpx;
  font-weight: 600;
}

.section-head,
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
}

.field-label {
  display: block;
  font-size: 25rpx;
  font-weight: 600;
  color: $theme-text;
}

.no-gap {
  margin-bottom: 0;
}

.section-tip,
.field-note,
.location-copy {
  font-size: 21rpx;
  color: $theme-muted;
}

.native-input,
.native-textarea {
  width: 100%;
  background: #fcfcfd;
  border: 2rpx solid rgba(15, 23, 42, 0.06);
  border-radius: 18rpx;
  color: $theme-text;
  font-size: 28rpx;
  padding: 20rpx 22rpx;
}

.native-input {
  height: 88rpx;
  line-height: 48rpx;
}

.native-textarea {
  min-height: 160rpx;
  line-height: 1.7;
}

.placeholder-text {
  color: #b2a391;
}

.media-action-btn {
  height: 72rpx;
  padding: 0 26rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #ff5f5f, #ff7c62);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
}

.light-btn {
  background: #f7f7f8;
  color: $theme-text;
}

.video-card {
  position: relative;
  margin-top: 18rpx;
  height: 280rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.video-poster {
  width: 100%;
  height: 100%;
}

.video-overlay,
.video-remove,
.image-badge,
.image-remove {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-overlay {
  left: 18rpx;
  bottom: 18rpx;
  height: 48rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(15, 12, 9, 0.48);
  color: #ffffff;
  font-size: 22rpx;
}

.video-remove,
.image-remove {
  top: 10rpx;
  right: 10rpx;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: rgba(15, 12, 9, 0.52);
  color: #ffffff;
  font-size: 28rpx;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 18rpx;
}

.image-item {
  position: relative;
  height: 188rpx;
  border-radius: 22rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.08);
}

.image-thumb {
  width: 100%;
  height: 100%;
}

.image-badge {
  left: 10rpx;
  bottom: 10rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(15, 12, 9, 0.46);
  color: #ffffff;
  font-size: 20rpx;
}

.media-icon-row {
  display: flex;
  gap: 24rpx;
}

.media-icon-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: #fff1ec;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-icon-symbol {
  font-size: 44rpx;
}

.empty-media-note {
  margin-top: 18rpx;
  padding: 20rpx 22rpx;
  border-radius: 20rpx;
  background: #fff8f5;
}

.empty-media-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: $theme-text;
}

.empty-media-copy {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: $theme-muted;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.location-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.location-action-btn {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #f7f7f8;
  color: $theme-text;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
}

.location-action-btn.strong {
  background: #fff1ec;
  color: #df5c46;
  font-weight: 600;
}

.location-pill.active {
  background: #eefbf0;
  color: #2f8f52;
}

.location-pill.warn {
  background: #fff5e8;
  color: #d97706;
}

.location-picker-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.36);
  display: flex;
  align-items: flex-end;
}

.location-picker-panel {
  width: 100%;
  max-height: 70vh;
  padding: 28rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  background: #fffdfb;
}

.location-picker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.location-picker-title,
.location-option-label {
  display: block;
  color: $theme-text;
}

.location-picker-title {
  font-size: 30rpx;
  font-weight: 700;
}

.location-picker-subtitle,
.location-option-meta,
.location-picker-state {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: $theme-muted;
}

.location-picker-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f7f7f8;
  color: $theme-text;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.location-picker-state {
  padding: 30rpx 0 12rpx;
}

.location-option-list {
  max-height: 54vh;
  margin-top: 20rpx;
}

.location-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(15, 23, 42, 0.05);
}

.location-option.active {
  border-bottom-color: rgba(223, 92, 70, 0.22);
}

.location-option-label {
  font-size: 27rpx;
  font-weight: 600;
}

.location-option-check {
  color: #df5c46;
  font-size: 23rpx;
  font-weight: 700;
  white-space: nowrap;
}

.error-banner {
  color: $theme-color;
  background: rgba(196, 69, 54, 0.1);
}

.bottom-submit-wrap {
  margin-top: 24rpx;
}

.bottom-submit-btn {
  width: 100%;
  height: 92rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 18rpx 30rpx rgba(255, 94, 98, 0.24);
}

.page-bottom-space {
  height: calc(40rpx + env(safe-area-inset-bottom));
}

@media screen and (max-width: 360px) {
  .image-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-head,
  .field-head,
  .location-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
