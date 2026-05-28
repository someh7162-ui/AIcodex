<template>
  <view class="page-shell">
    <view class="page-scroll" 
      @touchstart="handleTouchStart" 
      @touchmove="handleTouchMove" 
      @touchend="handleTouchEnd" 
      @touchcancel="handleTouchEnd"
    >
      <view class="hero hero-gradient atlas-hero">
        <view class="hero-bg-image" :style="heroBgStyle"></view>
        <view class="hero-silk-band hero-silk-band-left"></view>
        <view class="hero-silk-band hero-silk-band-right"></view>
        <view class="hero-overlay"></view>
        <view class="hero-topbar">
          <view class="menu-toggle" @tap="openSideMenu">
            <text class="menu-line"></text>
            <text class="menu-line"></text>
            <text class="menu-line short-line"></text>
          </view>
        </view>
        <view class="hero-content">
          <text class="hero-kicker">Seeking the Silk Road in Xinjiang</text>
          <text class="hero-title">丝路疆寻</text>
          <text class="hero-subtitle">沿着丝路风景，开启一段辽阔而热烈的旅程</text>
        </view>
      </view>

      <view class="main-content" :style="contentStyle">
        
        <view class="section section-block featured-section atlas-panel featured-panel">
          <view class="section-head">
            <view class="section-copy">
              <text class="section-kicker">Curated Selection</text>
              <text class="section-title editorial-title">{{ featuredSectionTitle }}</text>
            </view>
            <text class="link-text" @tap="goToDestinations">查看全部</text>
          </view>
          <view class="featured-list waterfall-grid">
            <view class="waterfall-column">
              <view v-for="item in featuredColumns.left" :key="item.id" class="destination-card editorial-card" @tap="openDetail(item.id)">
                <view class="editorial-media-wrap">
                  <view class="image-wrap editorial-image atlas-silk-sheen">
                    <CachedImage :src="item.image" image-class="cover-image" />
                    <view class="editorial-image-mask"></view>
                    <view class="rating-badge-glass editorial-rating-badge">
                      <text class="icon-star">★</text>
                      <text class="rating-num">{{ item.rating }}</text>
                    </view>
                  </view>
                </view>
                <view class="destination-body editorial-body">
                  <view class="title-row editorial-title-row">
                    <text class="destination-title">{{ item.name }}</text>
                    <view class="mini-ai-tag editorial-ai-tag" @tap.stop="openAiForDestination(item)">
                      <text class="icon-sparkle">✦</text>
                      <text>Ask AI</text>
                    </view>
                  </view>
                  <view class="meta-row editorial-meta-row">
                    <text class="icon-location">📍</text>
                    <text class="destination-meta">{{ item.location }}<text v-if="item.distanceText"> · {{ item.distanceText }}</text></text>
                  </view>
                  <text class="destination-desc-short">{{ item.description }}</text>
                </view>
              </view>
            </view>
            <view class="waterfall-column">
              <view v-for="item in featuredColumns.right" :key="item.id" class="destination-card editorial-card" @tap="openDetail(item.id)">
                <view class="editorial-media-wrap">
                  <view class="image-wrap editorial-image atlas-silk-sheen">
                    <CachedImage :src="item.image" image-class="cover-image" />
                    <view class="editorial-image-mask"></view>
                    <view class="rating-badge-glass editorial-rating-badge">
                      <text class="icon-star">★</text>
                      <text class="rating-num">{{ item.rating }}</text>
                    </view>
                  </view>
                </view>
                <view class="destination-body editorial-body">
                  <view class="title-row editorial-title-row">
                    <text class="destination-title">{{ item.name }}</text>
                    <view class="mini-ai-tag editorial-ai-tag" @tap.stop="openAiForDestination(item)">
                      <text class="icon-sparkle">✦</text>
                      <text>Ask AI</text>
                    </view>
                  </view>
                  <view class="meta-row editorial-meta-row">
                    <text class="icon-location">📍</text>
                    <text class="destination-meta">{{ item.location }}<text v-if="item.distanceText"> · {{ item.distanceText }}</text></text>
                  </view>
                  <text class="destination-desc-short">{{ item.description }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="section section-block niche-section atlas-panel">
          <view class="section-head">
            <view class="section-copy centered-copy">
              <text class="section-kicker secondary-kicker">Hidden Gems</text>
              <text class="section-title editorial-title">小众推荐</text>
            </view>
          </view>
          <text class="muted-text niche-note">适合想避开常规热门点的人</text>
          <view class="niche-list editorial-niche-list waterfall-grid">
            <view class="waterfall-column">
              <view v-for="(item, index) in nicheColumns.left" :key="item.id" class="niche-card editorial-niche-card" :class="{ 'is-reversed': index % 2 === 1 }" @tap="openDetail(item.id)">
                <view class="niche-media-shell">
                  <view class="image-wrap glass-wrap niche-image-wrap">
                    <CachedImage :src="item.image" image-class="cover-image" />
                  </view>
                </view>
                <view class="destination-body niche-body editorial-niche-body">
                  <view class="title-row editorial-title-row">
                    <text class="destination-title niche-title">{{ item.name }}</text>
                    <view class="mini-ai-tag editorial-ai-tag" @tap.stop="openAiForDestination(item)">
                      <text class="icon-sparkle">✦</text>
                      <text>Ask AI</text>
                    </view>
                  </view>
                  <view class="meta-row editorial-meta-row">
                    <text class="icon-location">📍</text>
                    <text class="destination-meta">{{ item.location }}</text>
                  </view>
                  <text class="destination-desc-short niche-desc">{{ item.description }}</text>
                  <text class="niche-reason">{{ item.suggestion }}</text>
                </view>
              </view>
            </view>
            <view class="waterfall-column">
              <view v-for="(item, index) in nicheColumns.right" :key="item.id" class="niche-card editorial-niche-card" :class="{ 'is-reversed': index % 2 === 0 }" @tap="openDetail(item.id)">
                <view class="niche-media-shell">
                  <view class="image-wrap glass-wrap niche-image-wrap">
                    <CachedImage :src="item.image" image-class="cover-image" />
                  </view>
                </view>
                <view class="destination-body niche-body editorial-niche-body">
                  <view class="title-row editorial-title-row">
                    <text class="destination-title niche-title">{{ item.name }}</text>
                    <view class="mini-ai-tag editorial-ai-tag" @tap.stop="openAiForDestination(item)">
                      <text class="icon-sparkle">✦</text>
                      <text>Ask AI</text>
                    </view>
                  </view>
                  <view class="meta-row editorial-meta-row">
                    <text class="icon-location">📍</text>
                    <text class="destination-meta">{{ item.location }}</text>
                  </view>
                  <text class="destination-desc-short niche-desc">{{ item.description }}</text>
                  <text class="niche-reason">{{ item.suggestion }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        </view>
        <view class="bottom-space"></view>
    </view>

    <view v-if="showSideMenu" class="side-menu-mask" @tap="closeSideMenu">
      <view class="side-menu-panel" @tap.stop>
        <view class="side-menu-head">
          <text class="side-menu-title">丝路疆寻</text>
          <text class="side-menu-close" @tap="closeSideMenu">×</text>
        </view>
        <view class="side-menu-copy">把常用入口收进这里，首页画面更干净。</view>
        <view class="side-menu-item primary-item" @tap="openHikingFromMenu">
          <view class="side-menu-icon">🚶</view>
          <view class="side-menu-content">
            <text class="side-menu-label">徒步模式</text>
            <text class="side-menu-desc">定位、离线地图、SOS 与露营风险提示</text>
          </view>
        </view>
      </view>
    </view>

    <AppTabBar current="/pages/home/index" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onPageScroll } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { destinationList } from '../../common/destination-data'
import { getCurrentLocation } from '../../services/amap'

const currentCoords = ref(null)
const showSideMenu = ref(false)
const pageScrollTop = ref(0)

// 朋友圈下拉交互核心状态
const pullDownY = ref(0) 
const isTransitioning = ref(false) 
const touchStartY = ref(0)

const featuredDestinations = computed(() => {
  if (!currentCoords.value) {
    return destinationList.slice(0, 3).map((item) => ({ ...item, distanceText: '' }))
  }

  return destinationList
    .map((item) => {
      const distanceKm = getDistanceKm(currentCoords.value, item.coordinates)
      return {
        ...item,
        distanceKm,
        distanceText: formatDistance(distanceKm),
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3)
})

const featuredSectionTitle = computed(() => (currentCoords.value ? '附近景区' : '精选景区'))
const featuredColumns = computed(() => splitAlternatingColumns(featuredDestinations.value))

const nicheDestinationIds = [48, 52, 55, 58, 62]

const nicheDestinations = computed(() => destinationList.filter((item) => nicheDestinationIds.includes(item.id)))
const nicheColumns = computed(() => splitAlternatingColumns(nicheDestinations.value))

onLoad(async () => {
  try {
    const location = await getCurrentLocation()
    currentCoords.value = {
      longitude: location.longitude,
      latitude: location.latitude,
    }
  } catch (error) {
    currentCoords.value = null
  }
})

onPageScroll((event) => {
  pageScrollTop.value = event.scrollTop || 0
})

// === 朋友圈下拉核心逻辑 ===
function handleTouchStart(event) {
  // 只有处于页面顶部时才允许放大触发
  if (pageScrollTop.value > 5) {
    touchStartY.value = 0
    return
  }
  const touch = event.touches?.[0]
  touchStartY.value = touch?.clientY || 0
  isTransitioning.value = false
}

function handleTouchMove(event) {
  if (!touchStartY.value || pageScrollTop.value > 5) return

  const touch = event.touches?.[0]
  const currentY = touch?.clientY || 0
  const deltaY = currentY - touchStartY.value

  if (deltaY > 0) {
    // 增加阻尼系数，产生拉扯感
    pullDownY.value = deltaY * 0.4 
  } else {
    pullDownY.value = 0
  }
}

function handleTouchEnd() {
  touchStartY.value = 0
  if (pullDownY.value > 0) {
    // 松手时归零，开启过渡动画
    isTransitioning.value = true
    pullDownY.value = 0
  }
}

// 动态样式：背景图放大
const heroBgStyle = computed(() => {
  const scale = 1 + (pullDownY.value * 0.0025);
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    transition: isTransitioning.value ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
  }
})

// 动态样式：内容区跟随手指下移
const contentStyle = computed(() => {
  return {
    transform: `translateY(${pullDownY.value}px)`,
    transition: isTransitioning.value ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
  }
})
// === 结束 ===

function goToDestinations() {
  uni.reLaunch({ url: '/pages/destinations/index' })
}

function openDetail(id) {
  uni.navigateTo({ url: `/pages/destination-detail/index?id=${id}` })
}

function openHikingMode() {
  uni.navigateTo({ url: '/pages/hiking/index' })
}

function openSideMenu() {
  showSideMenu.value = true
}

function closeSideMenu() {
  showSideMenu.value = false
}

function openHikingFromMenu() {
  closeSideMenu()
  openHikingMode()
}

function openAiForDestination(item) {
  const context = [
    `景区名称：${item.name}`,
    `所在地区：${item.location}`,
    `景区分类：${item.category}`,
    `景区介绍：${item.description}`,
    `适合玩法：${item.suggestion}`,
    `游玩提示：${item.tips.join('；')}`,
  ].join('\n')

  navigateToAiAssistant({
    title: item.name,
    desc: item.description,
    source: '首页',
    prompt: `我准备去${item.name}，请先告诉我这个景区最适合怎么安排。`,
    context,
    autoAsk: false,
  })
}

function navigateToAiAssistant(params) {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')

  uni.navigateTo({ url: `/pages/ai-assistant/index?${query}` })
}

function getDistanceKm(from, to) {
  if (!from || !to) {
    return Number.POSITIVE_INFINITY
  }

  const toRad = (value) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return ''
  }

  if (distanceKm < 1) {
    return `约 ${Math.round(distanceKm * 1000)} 米`
  }

  return `约 ${distanceKm.toFixed(1)} 公里`
}

function splitAlternatingColumns(list) {
  return list.reduce(
    (columns, item, index) => {
      if (index % 2 === 0) {
        columns.left.push(item)
      } else {
        columns.right.push(item)
      }

      return columns
    },
    { left: [], right: [] }
  )
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero {
  position: relative;
  min-height: 1120rpx;
  overflow: visible;
  z-index: 1;
}

.page-scroll {
  background: #faf9f5;
  position: relative;
  padding-bottom: 40rpx;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(70, 28, 20, 0.22) 0%, rgba(70, 28, 20, 0.1) 68%, rgba(250, 249, 245, 0) 100%);
  pointer-events: none;
}

/* 背景图属性迁移到了 .hero-bg-image 上 */
.hero-bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-image: url('https://bkimg.cdn.bcebos.com/pic/3b6833f59a17901bbd31090c?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70');
  background-size: cover;
  background-position: center 36%;
  background-repeat: no-repeat;
  opacity: 0.62;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.84) 60%, rgba(0, 0, 0, 0.36) 88%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.84) 60%, rgba(0, 0, 0, 0.36) 88%, transparent 100%);
}

.hero-silk-band {
  position: absolute;
  top: -80rpx;
  width: 280rpx;
  height: 680rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.02));
  filter: blur(10rpx);
  transform: rotate(12deg);
  opacity: 0.16;
}

.hero-silk-band-left {
  left: -90rpx;
}

.hero-silk-band-right {
  right: -110rpx;
  transform: rotate(-14deg);
}

.hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 180rpx 48rpx 430rpx;
  text-align: center;
  color: #ffffff;
}

.hero-topbar {
  position: absolute;
  top: 74rpx;
  left: 30rpx;
  z-index: 2;
}

.menu-toggle {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  background: rgba(250, 249, 245, 0.18);
  border: 2rpx solid rgba(255, 243, 228, 0.24);
  backdrop-filter: blur(16rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: 0 12rpx 24rpx rgba(54, 18, 10, 0.12);
}

.menu-line {
  width: 32rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #fff7ee;
}

.short-line {
  width: 22rpx;
}

.hero-kicker {
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 7rpx;
  text-transform: uppercase;
  color: rgba(255, 239, 214, 0.92);
}

.hero-title {
  margin-top: 18rpx;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 84rpx;
  font-style: italic;
  font-weight: 900;
  line-height: 1.04;
  letter-spacing: 2rpx;
  text-shadow: 0 12rpx 32rpx rgba(54, 18, 10, 0.22);
}

.hero-subtitle {
  margin-top: 20rpx;
  max-width: 620rpx;
  font-size: 29rpx;
  line-height: 1.8;
  color: rgba(255, 247, 238, 0.9);
}

/* =====================================
   内容区布局（覆盖效果核心）
   ===================================== */
.main-content {
  position: relative;
  z-index: 6; 
  /* 负边距让内容自然叠加在 hero 区域上 */
  margin-top: -700rpx; 
  padding: 0 24rpx 40rpx;
}

.section-block {
  margin-top: 56rpx;
}

/* 移除了绝对定位，回归正常文档流 */
.featured-section {
  position: relative;
  margin-top: 0;
}

.featured-panel {
  padding: 42rpx 28rpx;
  border-radius: 40rpx;
  box-shadow: 0 28rpx 60rpx rgba(27, 28, 26, 0.1);
}

.niche-section {
  /* 调整为正常的板块间距 */
  margin-top: 48rpx;
}

.last-block {
  padding-bottom: 28rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.section-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.centered-copy {
  width: 100%;
  align-items: center;
}

.section-kicker {
  color: #a22d21;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 7rpx;
  text-transform: uppercase;
}

.secondary-kicker {
  color: #825500;
}

.editorial-title {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 54rpx;
  font-weight: 800;
  color: #1b1c1a;
  line-height: 1.14;
  letter-spacing: 1rpx;
}

.link-text {
  flex-shrink: 0;
  color: #a22d21;
  font-size: 22rpx;
  font-weight: 700;
  padding-bottom: 8rpx;
  border-bottom: 4rpx solid rgba(162, 45, 33, 0.14);
  line-height: 1.3;
}

.featured-list {
  display: flex;
  gap: 24rpx;
}

.waterfall-grid {
  align-items: flex-start;
}

.waterfall-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.editorial-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border-radius: 28rpx;
  padding-bottom: 10rpx;
}

.destination-card:active {
  transform: scale(0.992);
}

.editorial-media-wrap {
  padding: 0;
}

.editorial-image {
  height: 500rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #efeeea;
}

.atlas-silk-sheen {
  position: relative;
}

.atlas-silk-sheen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.26) 0%, transparent 48%, rgba(0, 0, 0, 0.08) 100%);
  z-index: 1;
  pointer-events: none;
}

.editorial-image-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(27, 28, 26, 0.02) 0%, rgba(27, 28, 26, 0.12) 100%);
  z-index: 1;
}

.editorial-rating-badge {
  top: 26rpx;
  right: 26rpx;
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(255, 255, 255, 0.5);
  z-index: 2;
}

.editorial-rating-badge .rating-num {
  color: #1b1c1a;
}

.niche-note {
  display: block;
  text-align: center;
  font-size: 23rpx;
  color: #58413e;
  margin-bottom: 32rpx;
  line-height: 1.8;
}

.niche-card {
  overflow: hidden;
}

.atlas-panel {
  position: relative;
  padding: 42rpx 28rpx;
  border-radius: 32rpx;
  background: #ffffff;
  border: 2rpx solid rgba(162, 45, 33, 0.06);
  box-shadow: 0 18rpx 42rpx rgba(27, 28, 26, 0.06);
  overflow: hidden;
}

.featured-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 140rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(162, 45, 33, 0.18);
}

.atlas-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 10rpx, rgba(162, 45, 33, 0.012) 10rpx, rgba(162, 45, 33, 0.012) 20rpx),
    repeating-linear-gradient(-45deg, transparent, transparent 10rpx, rgba(241, 162, 11, 0.012) 10rpx, rgba(241, 162, 11, 0.012) 20rpx);
  pointer-events: none;
}

.atlas-panel > * {
  position: relative;
  z-index: 1;
}

.side-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(27, 28, 26, 0.34);
  backdrop-filter: blur(8rpx);
}

.side-menu-panel {
  width: 560rpx;
  max-width: calc(100vw - 88rpx);
  height: 100%;
  padding: 92rpx 34rpx 40rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 24rpx 0 48rpx rgba(27, 28, 26, 0.12);
}

.side-menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.side-menu-title {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 42rpx;
  font-weight: 800;
  color: #1b1c1a;
}

.side-menu-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: rgba(162, 45, 33, 0.08);
  color: #a22d21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  line-height: 1;
}

.side-menu-copy {
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: #58413e;
}

.side-menu-item {
  margin-top: 38rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 26rpx;
  border-radius: 28rpx;
  background: #faf9f5;
  border: 2rpx solid rgba(162, 45, 33, 0.08);
}

.primary-item {
  box-shadow: 0 16rpx 32rpx rgba(27, 28, 26, 0.06);
}

.side-menu-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #a22d21, #c44536);
  color: #fffaf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}

.side-menu-content {
  flex: 1;
  min-width: 0;
}

.side-menu-label {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b1c1a;
}

.side-menu-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #58413e;
}

.editorial-niche-list {
  display: flex;
  gap: 24rpx;
}

.editorial-niche-card {
  display: flex;
  flex-direction: column;
  border-radius: 28rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 18rpx 36rpx rgba(27, 28, 26, 0.08);
  padding-bottom: 10rpx;
}

.niche-media-shell {
  width: 100%;
}

.niche-image-wrap {
  height: 312rpx;
}

.niche-title {
  font-size: 34rpx;
}

.editorial-niche-body {
  padding: 32rpx 32rpx 36rpx;
}

.niche-desc {
  margin-top: 14rpx;
}

.niche-reason {
  display: block;
  margin-top: 18rpx;
  font-size: 20rpx;
  line-height: 1.9;
  color: #a22d21;
  letter-spacing: 3rpx;
  text-transform: uppercase;
}

.image-wrap {
  position: relative;
  height: 360rpx;
}

.glass-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(17, 12, 9, 0.2) 100%);
  pointer-events: none;
}

.rating-badge-glass {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 100rpx;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.icon-star {
  color: #f1a20b;
  font-size: 20rpx;
}

.rating-num {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}

.destination-body {
  padding: 28rpx 12rpx 18rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 14rpx;
}

.editorial-title-row {
  margin-bottom: 10rpx;
}

.destination-title {
  flex: 1;
  display: block;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 36rpx;
  font-weight: 700;
  color: #1b1c1a;
  line-height: 1.25;
}

.mini-ai-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #825500;
  font-size: 19rpx;
  font-weight: 800;
  line-height: 1.3;
}

.icon-sparkle {
  font-size: 20rpx;
}

.editorial-ai-tag {
  padding-top: 10rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.editorial-meta-row {
  margin-bottom: 10rpx;
}

.icon-location {
  flex-shrink: 0;
  font-size: 24rpx;
}

.destination-meta {
  display: block;
  font-size: 22rpx;
  color: #58413e;
  line-height: 1.6;
}

.destination-desc-short {
  display: block;
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.8;
  color: #58413e;
}

@media screen and (max-width: 720rpx) {
  .hero-title {
    font-size: 72rpx;
  }

  .hero-subtitle {
    font-size: 30rpx;
  }

  .hero-content {
    padding: 168rpx 36rpx 320rpx;
  }

  .hero-topbar {
    top: 56rpx;
    left: 24rpx;
  }

  .hero {
    min-height: 980rpx;
  }

  .main-content {
    margin-top: -600rpx;
    padding: 0 20rpx 40rpx;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .featured-list,
  .editorial-niche-list {
    flex-direction: column;
    gap: 18rpx;
  }

  .featured-panel,
  .atlas-panel {
    padding: 32rpx 22rpx;
  }

  .featured-panel {
    border-radius: 34rpx;
    box-shadow: 0 20rpx 40rpx rgba(27, 28, 26, 0.1);
  }

  .niche-section {
    margin-top: 40rpx;
  }

  .waterfall-column {
    gap: 24rpx;
  }

  .editorial-title {
    font-size: 46rpx;
  }

  .link-text {
    padding-bottom: 4rpx;
  }

  .editorial-image {
    height: 440rpx;
  }

  .destination-body {
    padding: 22rpx 4rpx 12rpx;
  }

  .title-row {
    flex-direction: column;
    gap: 10rpx;
  }

  .destination-title {
    font-size: 34rpx;
  }

  .destination-desc-short {
    font-size: 22rpx;
  }

  .editorial-niche-card,
  .editorial-niche-card.is-reversed {
    border-right-width: 0;
  }

  .editorial-niche-body {
    padding: 28rpx 26rpx 30rpx;
  }

  .niche-image-wrap {
    height: 280rpx;
  }

  .side-menu-panel {
    width: 100vw;
    max-width: 100vw;
    padding: 88rpx 26rpx 36rpx;
  }

}
</style>
