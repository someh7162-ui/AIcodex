<template>
  <view class="page-shell guides-page">
    <view class="page-scroll guides-scroll">
      <view class="hero-shell hero-gradient">
        <view class="status-space" :style="statusBarStyle"></view>

        <view class="hero-topbar section">
          <view class="hero-action left-action chat-entry" @tap="openAiAssistant">💬</view>
          <view class="primary-tabs">
            <view
              v-for="tab in primaryTabs"
              :key="tab"
              class="primary-tab"
              :class="{ active: activePrimaryTab === tab }"
              @tap="setPrimaryTab(tab)"
            >
              <text class="primary-label">{{ tab }}</text>
              <view v-if="tab === '发现' && feedBadgeCount" class="tab-badge">{{ feedBadgeCount }}</view>
              <view v-if="activePrimaryTab === tab" class="primary-indicator"></view>
            </view>
          </view>
          <view class="hero-actions">
            <view class="hero-action" :class="{ active: showSearchBar }" @tap="toggleSearchBar">⌕</view>
            <view class="hero-action text-action" :class="{ active: showSortPanel }" @tap="toggleSortPanel">筛</view>
          </view>
        </view>

        <view v-if="showSearchBar" class="section search-shell">
          <view class="search-bar">
            <text class="search-icon">⌕</text>
            <input
              v-model="searchQuery"
              class="search-input"
              type="text"
              confirm-type="search"
              maxlength="40"
              placeholder="搜索作者、标题或相关内容"
              placeholder-class="search-placeholder"
            />
            <view v-if="searchQuery" class="search-clear" @tap="clearSearch">×</view>
          </view>
          <text class="search-hint">支持搜索作者昵称、攻略标题、摘要和标签</text>
        </view>

      </view>

      <view class="subnav-shell section">
        <scroll-view class="subnav-scroll" scroll-x>
          <view class="subnav-list">
            <view
              v-for="tab in visibleSubTabs"
              :key="tab"
              class="subnav-chip"
              :class="{ active: activeSubTab === tab }"
              @tap="setSubTab(tab)"
            >
              {{ tab }}
            </view>
          </view>
        </scroll-view>
        <view class="subnav-more" @tap="toggleCategoryPanel">
          <text class="more-icon">▾</text>
        </view>
      </view>

      <view class="section waterfall-shell">
        <view v-if="loading" class="empty-state card">
          <text class="section-title">正在加载攻略</text>
          <text class="empty-copy">正在从服务器同步最新的新疆攻略内容。</text>
        </view>
        <view v-else-if="errorMessage" class="empty-state card">
          <text class="section-title">加载失败</text>
          <text class="empty-copy">{{ errorMessage }}</text>
          <view class="retry-btn" @tap="loadGuides">重新加载</view>
        </view>
        <view v-else-if="leftColumn.length || rightColumn.length" class="waterfall-grid">
          <view class="waterfall-column">
            <view v-for="item in leftColumn" :key="item.id" class="feed-card" @tap="openGuide(item.id)">
              <view v-if="hasVisualCover(item)" class="cover-shell" :style="coverStyle(item)">
                <CachedImage :src="item.image" image-class="cover-image" />
                <view class="cover-mask"></view>
                <view class="cover-badges">
                  <text class="content-pill">{{ item.contentType }}</text>
                  <text class="location-pill">{{ item.locationTag }}</text>
                </view>
                <view v-if="item.contentType === '视频'" class="video-badge">▶ 视频</view>
                <view v-if="item.imageCount > 1" class="image-count-badge">{{ item.imageCount }} 图</view>
              </view>
              <view v-else class="text-note-shell">
                <view class="text-note-head">
                  <text class="content-pill solid-pill">{{ item.contentType }}</text>
                  <text class="location-mini">{{ item.locationTag }}</text>
                </view>
                <text class="text-note-copy">{{ noteSummary(item) }}</text>
              </view>

              <view class="feed-content">
                <text class="feed-title">{{ item.title }}</text>
                <view class="author-row">
                  <CachedImage :src="displayAuthorAvatar(item)" container-class="author-avatar-shell" image-class="author-avatar" />
                  <text class="author-name">{{ item.nickname }}</text>
                  <text class="author-dot">·</text>
                  <text class="author-meta">{{ item.category }}</text>
                </view>
                <view class="feed-footer">
                  <view class="stat-chip">
                    <text class="stat-icon">♡</text>
                    <text class="stat-text">{{ formatCount(item.likesCount) }}</text>
                  </view>
                  <view class="stat-chip muted-chip">
                    <text class="stat-icon">⌑</text>
                    <text class="stat-text">{{ formatCount(item.commentCount) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view class="waterfall-column">
            <view v-for="item in rightColumn" :key="item.id" class="feed-card" @tap="openGuide(item.id)">
              <view v-if="hasVisualCover(item)" class="cover-shell" :style="coverStyle(item)">
                <CachedImage :src="item.image" image-class="cover-image" />
                <view class="cover-mask"></view>
                <view class="cover-badges">
                  <text class="content-pill">{{ item.contentType }}</text>
                  <text class="location-pill">{{ item.locationTag }}</text>
                </view>
                <view v-if="item.contentType === '视频'" class="video-badge">▶ 视频</view>
                <view v-if="item.imageCount > 1" class="image-count-badge">{{ item.imageCount }} 图</view>
              </view>
              <view v-else class="text-note-shell">
                <view class="text-note-head">
                  <text class="content-pill solid-pill">{{ item.contentType }}</text>
                  <text class="location-mini">{{ item.locationTag }}</text>
                </view>
                <text class="text-note-copy">{{ noteSummary(item) }}</text>
              </view>

              <view class="feed-content">
                <text class="feed-title">{{ item.title }}</text>
                <view class="author-row">
                  <CachedImage :src="displayAuthorAvatar(item)" container-class="author-avatar-shell" image-class="author-avatar" />
                  <text class="author-name">{{ item.nickname }}</text>
                  <text class="author-dot">·</text>
                  <text class="author-meta">{{ item.publishDate }}</text>
                </view>
                <view class="feed-footer">
                  <view class="stat-chip">
                    <text class="stat-icon">♡</text>
                    <text class="stat-text">{{ formatCount(item.likesCount) }}</text>
                  </view>
                  <view class="stat-chip muted-chip">
                    <text class="stat-icon">⌑</text>
                    <text class="stat-text">{{ formatCount(item.saveCount) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state card">
          <text class="section-title">{{ emptyTitle }}</text>
          <text class="empty-copy">{{ emptyDescription }}</text>
        </view>
      </view>

      <view class="bottom-space extra-space"></view>
    </view>

    <view v-if="showCategoryPanel" class="category-mask" @tap="toggleCategoryPanel">
      <view class="category-panel" @tap.stop>
        <view class="panel-head">
          <text class="panel-title">全部分类</text>
          <view class="panel-close" @tap="toggleCategoryPanel">×</view>
        </view>
        <view class="category-grid">
          <view
            v-for="tab in allSubTabs"
            :key="tab"
            class="category-item"
            :class="{ active: activeSubTab === tab }"
            @tap="selectCategory(tab)"
          >
            <text class="category-label">{{ tab }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showSortPanel" class="category-mask" @tap="toggleSortPanel">
      <view class="sort-panel" @tap.stop>
        <view class="panel-head">
          <text class="panel-title">排序方式</text>
          <view class="panel-close" @tap="toggleSortPanel">×</view>
        </view>
        <view class="sort-list">
          <view
            v-for="option in sortOptions"
            :key="option.value"
            class="sort-item"
            :class="{ active: sortMode === option.value }"
            @tap="selectSort(option.value)"
          >
            <text class="sort-label">{{ option.label }}</text>
            <text class="sort-desc">{{ option.description }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="fab" @tap="publishGuide">
      <text class="fab-icon">+</text>
      <text class="fab-label">发布</text>
    </view>

    <AppTabBar current="/pages/guides/index" />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { getStoredAuthToken, getStoredAuthUser } from '../../common/auth-storage'
import { getCurrentLocation, reverseGeocode } from '../../services/amap'
import { getGuideFeed } from '../../services/guides'

const primaryTabs = ['关注', '发现', '同城']
const allSubTabs = ['推荐', '自驾', '美食', '安全', '徒步', '住宿']
const visibleSubTabs = allSubTabs.slice(0, 5)
const sortOptions = [
  { value: 'recommended', label: '推荐排序', description: '保持当前推荐流顺序' },
  { value: 'latest', label: '最新发布', description: '优先查看最近更新的攻略' },
  { value: 'hot', label: '热度优先', description: '按点赞、收藏和评论综合排序' },
]

const activePrimaryTab = ref('发现')
const activeSubTab = ref('推荐')
const guides = ref([])
const showCategoryPanel = ref(false)
const showSearchBar = ref(false)
const showSortPanel = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const detectedCity = ref('')
const cityLoading = ref(false)
const searchQuery = ref('')
const sortMode = ref('recommended')

const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : {}
const statusBarHeight = systemInfo.statusBarHeight || 20
const statusBarStyle = computed(() => ({ height: `${statusBarHeight}px` }))

const currentUser = computed(() => getStoredAuthUser() || null)
const isLoggedIn = computed(() => Boolean(getStoredAuthToken() && currentUser.value))

const filteredGuides = computed(() => {
  const keyword = normalizeSearchText(searchQuery.value)
  const matched = guides.value.filter((item) => {
    const primaryMatched = activePrimaryTab.value === '同城'
      ? isSameCityGuide(item)
      : true

    if (!primaryMatched) {
      return false
    }

    if (activeSubTab.value === '推荐') {
      return matchesGuideSearch(item, keyword)
    }

    return item.subCategory === activeSubTab.value && matchesGuideSearch(item, keyword)
  })

  return sortGuides(matched, sortMode.value)
})

const feedBadgeCount = computed(() => {
  return guides.value.reduce((total, item) => total + (item.badgeCount || 0), 0)
})

const emptyTitle = computed(() => {
  if (activePrimaryTab.value === '关注' && !isLoggedIn.value) {
    return '登录后查看关注流'
  }

  if (activePrimaryTab.value === '关注') {
    return '关注流还没有内容'
  }

  if (activePrimaryTab.value === '同城') {
    if (searchQuery.value) {
      return `没有找到与“${searchQuery.value}”相关的同城攻略`
    }
    return detectedCity.value ? `${detectedCity.value} 暂时还没有内容` : '定位后查看同城流'
  }

  if (searchQuery.value) {
    return `没有找到与“${searchQuery.value}”相关的攻略`
  }

  return '这个分类暂时还没有内容'
})

const emptyDescription = computed(() => {
  if (activePrimaryTab.value === '关注' && !isLoggedIn.value) {
    return '先登录并关注感兴趣的作者，之后他们发布的新攻略会优先出现在这里。'
  }

  if (activePrimaryTab.value === '关注') {
    return '去发现页逛逛并关注喜欢的作者，新的内容发布后会自动出现在这里。'
  }

  if (activePrimaryTab.value === '同城') {
    if (searchQuery.value) {
      return '试试换个作者名、标题关键词，或者切换分类后再搜。'
    }
    return detectedCity.value
      ? `暂时还没有来自 ${detectedCity.value} 的攻略，稍后再刷新看看。`
      : '允许定位后，这里会自动显示你当前城市的攻略，比如人在乌鲁木齐就看乌鲁木齐。'
  }

  if (searchQuery.value) {
    return '可以搜索作者昵称、攻略标题、摘要里的关键词，或者切换排序方式看看。'
  }

  return '可以切换分类看看，或者稍后重新刷新真实攻略流。'
})

const waterfallColumns = computed(() => {
  const left = []
  const right = []
  let leftHeight = 0
  let rightHeight = 0

  filteredGuides.value.forEach((item) => {
    const estimatedHeight = estimateFeedCardHeight(item)
    if (leftHeight <= rightHeight) {
      left.push(item)
      leftHeight += estimatedHeight
      return
    }

    right.push(item)
    rightHeight += estimatedHeight
  })

  return { left, right }
})

const leftColumn = computed(() => waterfallColumns.value.left)
const rightColumn = computed(() => waterfallColumns.value.right)

onShow(() => {
  loadGuides()
})

watch(activePrimaryTab, () => {
  loadGuides()
})

function setPrimaryTab(tab) {
  activePrimaryTab.value = tab
}

function setSubTab(tab) {
  activeSubTab.value = tab
}

function toggleCategoryPanel() {
  showSortPanel.value = false
  showCategoryPanel.value = !showCategoryPanel.value
}

function toggleSearchBar() {
  showCategoryPanel.value = false
  showSortPanel.value = false
  showSearchBar.value = !showSearchBar.value
  if (!showSearchBar.value) {
    clearSearch()
  }
}

function clearSearch() {
  searchQuery.value = ''
}

function toggleSortPanel() {
  showCategoryPanel.value = false
  showSearchBar.value = false
  showSortPanel.value = !showSortPanel.value
}

function selectSort(value) {
  sortMode.value = value
  showSortPanel.value = false
}

function selectCategory(tab) {
  activeSubTab.value = tab
  showCategoryPanel.value = false
}

function coverStyle(item) {
  const ratio = Number(item.coverAspectRatio) || 1.45
  return {
    height: `${Math.round(280 * ratio)}rpx`,
  }
}

function estimateFeedCardHeight(item) {
  if (hasVisualCover(item)) {
    return 260 + Math.round((Number(item.coverAspectRatio) || 1.4) * 120)
  }

  const summaryLength = noteSummary(item).slice(0, 80).length
  return 320 + Math.ceil(summaryLength / 18) * 26
}

function hasVisualCover(item) {
  return Boolean(item?.image)
}

function noteSummary(item) {
  return item?.summaryText || item?.excerpt || (Array.isArray(item?.highlights) ? item.highlights.map((tag) => `#${tag}`).join(' ') : '') || '发布了一条新的新疆旅行笔记。'
}

function displayAuthorAvatar(item) {
  if (item?.authorId && currentUser.value?.id && item.authorId === currentUser.value.id) {
    return currentUser.value?.avatar_url || currentUser.value?.avatar || item.authorAvatar || ''
  }

  return item?.authorAvatar || ''
}

function matchesGuideSearch(item, keyword) {
  if (!keyword) {
    return true
  }

  const haystack = [
    item?.nickname,
    item?.author,
    item?.title,
    item?.excerpt,
    item?.summaryText,
    item?.location,
    item?.locationTag,
    item?.category,
    ...(Array.isArray(item?.highlights) ? item.highlights : []),
  ]
    .filter(Boolean)
    .map(normalizeSearchText)

  return haystack.some((text) => text.includes(keyword))
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase()
}

function sortGuides(list, mode) {
  const items = Array.isArray(list) ? [...list] : []
  if (mode === 'latest') {
    return items.sort((left, right) => getGuideTime(right) - getGuideTime(left))
  }

  if (mode === 'hot') {
    return items.sort((left, right) => getGuideHotScore(right) - getGuideHotScore(left))
  }

  return items
}

function getGuideTime(item) {
  const raw = item?.publishDate || item?.createdAt || ''
  const stamp = Date.parse(raw)
  return Number.isFinite(stamp) ? stamp : 0
}

function getGuideHotScore(item) {
  return Number(item?.likesCount || 0) * 3
    + Number(item?.saveCount || 0) * 2
    + Number(item?.commentCount || 0) * 4
}

function formatCount(value) {
  const count = Number(value) || 0
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return `${count}`
}

function openGuide(id) {
  uni.navigateTo({
    url: `/pages/guide-detail/index?id=${encodeURIComponent(id)}`,
  })
}

function openAiAssistant() {
  uni.navigateTo({ url: '/pages/ai-assistant/index' })
}

function publishGuide() {
  if (!currentUser.value) {
    uni.showModal({
      title: '先登录再发布',
      content: '发布功能会使用当前登录昵称回流到信息流，先去登录页完成账号登录。',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/auth/index?mode=login' })
        }
      },
    })
    return
  }

  uni.navigateTo({ url: '/pages/guide-publish/index' })
}

async function loadGuides() {
  if (activePrimaryTab.value === '关注' && !isLoggedIn.value) {
    guides.value = []
    errorMessage.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    if (activePrimaryTab.value === '同城') {
      await ensureDetectedCity()
    }

    const params = activePrimaryTab.value === '关注'
      ? { scope: 'following' }
      : {}
    guides.value = await getGuideFeed(params)
  } catch (error) {
    guides.value = []
    errorMessage.value = error.message || '无法连接攻略服务，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function ensureDetectedCity() {
  if (detectedCity.value || cityLoading.value) {
    return
  }

  cityLoading.value = true
  try {
    const location = await getCurrentLocation()
    const regeo = await reverseGeocode(location.longitude, location.latitude)
    const city = normalizeCityName(
      regeo?.addressComponent?.city
      || regeo?.addressComponent?.district
      || ''
    )
    detectedCity.value = city
  } catch {
    detectedCity.value = ''
  } finally {
    cityLoading.value = false
  }
}

function normalizeCityName(value) {
  const text = String(value || '').trim()
  return text.replace(/特别行政区$|自治区$|自治州$|地区$|市$|县$|区$/g, '')
}

function isSameCityGuide(item) {
  if (item?.cityTab !== '同城') {
    return false
  }

  if (!detectedCity.value) {
    return true
  }

  const candidates = [item?.locationTag, item?.location, item?.title, item?.summaryText]
    .filter(Boolean)
    .map(normalizeCityName)

  return candidates.some((text) => text.includes(detectedCity.value) || detectedCity.value.includes(text))
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.guides-page {
  background:
    radial-gradient(circle at top right, rgba(255, 233, 208, 0.92), transparent 34%),
    linear-gradient(180deg, #f7efe6 0%, #faf8f5 42%, #f6f1ea 100%);
}

.guides-scroll {
  padding-bottom: calc(260rpx + env(safe-area-inset-bottom));
}

.hero-shell {
  position: relative;
  padding-bottom: 42rpx;
  color: #ffffff;
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
  overflow: hidden;
}

.hero-shell::after {
  content: '';
  position: absolute;
  right: -80rpx;
  top: 120rpx;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.status-space {
  width: 100%;
}

.hero-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding-top: 18rpx;
}

.hero-actions,
.primary-tabs {
  display: flex;
  align-items: center;
}

.hero-actions {
  gap: 14rpx;
}

.hero-action {
  width: 68rpx;
  height: 68rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12rpx);
  font-size: 28rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.hero-action.active {
  background: rgba(255, 255, 255, 0.28);
}

.text-action {
  font-size: 24rpx;
}

.chat-entry {
  font-size: 30rpx;
}

.left-action {
  margin-right: 4rpx;
}

.primary-tabs {
  flex: 1;
  justify-content: center;
  gap: 34rpx;
}

.primary-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 90rpx;
  padding-bottom: 18rpx;
  opacity: 0.72;
}

.primary-tab.active {
  opacity: 1;
}

.primary-label {
  font-size: 30rpx;
  font-weight: 600;
}

.tab-badge {
  position: absolute;
  top: -10rpx;
  right: -26rpx;
  min-width: 34rpx;
  height: 34rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #ffedd6;
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 700;
}

.primary-indicator {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 40rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: #ff5a4e;
  transform: translateX(-50%);
}

.subnav-shell {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: -22rpx;
  position: relative;
  z-index: 2;
}

.search-shell {
  position: relative;
  z-index: 2;
  margin-top: 18rpx;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 82rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16rpx 32rpx rgba(45, 24, 16, 0.08);
}

.search-icon,
.search-clear {
  flex-shrink: 0;
  color: $theme-muted;
  font-size: 24rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 24rpx;
  color: $theme-text;
}

.search-placeholder {
  color: #b39a82;
}

.search-hint {
  display: block;
  margin-top: 10rpx;
  padding-left: 6rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.subnav-scroll {
  flex: 1;
  min-width: 0;
}

.subnav-list {
  display: inline-flex;
  align-items: center;
  gap: 18rpx;
  padding: 10rpx 8rpx 10rpx 0;
}

.subnav-chip,
.subnav-more {
  height: 72rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 2rpx solid rgba(212, 165, 116, 0.2);
  box-shadow: 0 14rpx 32rpx rgba(45, 24, 16, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: $theme-muted;
}

.subnav-chip {
  padding: 0 28rpx;
  font-size: 24rpx;
  white-space: nowrap;
}

.subnav-chip.active {
  background: $theme-color;
  border-color: $theme-color;
  color: #ffffff;
}

.subnav-more {
  width: 72rpx;
  flex-shrink: 0;
}

.more-icon {
  font-size: 26rpx;
  font-weight: 700;
}

.waterfall-shell {
  margin-top: 20rpx;
}

.waterfall-grid {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  min-width: 0;
}

.feed-card {
  overflow: hidden;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 2rpx solid rgba(212, 165, 116, 0.18);
  box-shadow: 0 18rpx 40rpx rgba(45, 24, 16, 0.1);
}

.cover-shell {
  position: relative;
  overflow: hidden;
}

.text-note-shell {
  padding: 24rpx 22rpx 18rpx;
  background:
    linear-gradient(180deg, rgba(255, 248, 244, 0.94), rgba(255, 255, 255, 0.98)),
    #ffffff;
  border-bottom: 2rpx solid rgba(212, 165, 116, 0.12);
}

.text-note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.text-note-copy {
  display: block;
  margin-top: 16rpx;
  font-size: 25rpx;
  line-height: 1.75;
  color: $theme-text;
}

.cover-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(21, 13, 9, 0.06), rgba(21, 13, 9, 0.34));
}

.cover-badges {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.image-count-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(15, 12, 9, 0.46);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
  backdrop-filter: blur(10rpx);
}

.content-pill,
.location-pill {
  max-width: 50%;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
  backdrop-filter: blur(10rpx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-content {
  padding: 20rpx 18rpx 22rpx;
}

.feed-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.45;
  color: $theme-text;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 16rpx;
  min-width: 0;
}

.author-avatar {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(212, 165, 116, 0.2);
}

.author-avatar-shell {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-name,
.author-meta,
.author-dot {
  font-size: 21rpx;
  color: $theme-muted;
}

.author-name,
.author-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 18rpx;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
}

.muted-chip {
  background: rgba(212, 165, 116, 0.16);
  color: #8d6738;
}

.stat-icon,
.stat-text {
  font-size: 20rpx;
  line-height: 1;
}

.empty-state {
  padding: 36rpx 30rpx;
}

.empty-copy {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: $theme-muted;
}

.retry-btn {
  margin-top: 22rpx;
  height: 76rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: $theme-color;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
}

.category-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(28, 16, 10, 0.42);
  padding: calc(120rpx + env(safe-area-inset-top)) 24rpx calc(40rpx + env(safe-area-inset-bottom));
}

.category-panel,
.sort-panel {
  width: 100%;
  min-height: 520rpx;
  border-radius: 36rpx;
  background: #fffaf5;
  padding: 32rpx;
  box-shadow: 0 24rpx 56rpx rgba(45, 24, 16, 0.16);
}

.video-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(15, 12, 9, 0.46);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
}

.solid-pill {
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
}

.location-mini {
  font-size: 21rpx;
  color: $theme-muted;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.panel-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $theme-text;
}

.panel-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 165, 116, 0.14);
  color: $theme-color;
  font-size: 36rpx;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 30rpx;
}

.sort-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 30rpx;
}

.sort-item {
  padding: 24rpx 22rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 2rpx solid rgba(212, 165, 116, 0.18);
}

.sort-item.active {
  background: linear-gradient(135deg, rgba(196, 69, 54, 0.12), rgba(226, 155, 82, 0.16));
  border-color: rgba(196, 69, 54, 0.28);
}

.sort-label,
.sort-desc {
  display: block;
}

.sort-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $theme-text;
}

.sort-desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: $theme-muted;
}

.category-item {
  height: 112rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 2rpx solid rgba(212, 165, 116, 0.18);
  color: $theme-muted;
}

.category-item.active {
  background: linear-gradient(135deg, #c44536, #e29b52);
  border-color: transparent;
  color: #ffffff;
}

.category-label {
  font-size: 26rpx;
  font-weight: 600;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(188rpx + env(safe-area-inset-bottom));
  z-index: 25;
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #c44536, #ef7b4b);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  box-shadow: 0 18rpx 40rpx rgba(196, 69, 54, 0.32);
}

.fab-icon {
  font-size: 34rpx;
  line-height: 1;
}

.fab-label {
  font-size: 22rpx;
  font-weight: 600;
}

.extra-space {
  height: 44rpx;
}

@media screen and (max-width: 360px) {
  .primary-tabs {
    gap: 22rpx;
  }
}
</style>
