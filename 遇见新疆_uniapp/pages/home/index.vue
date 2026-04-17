<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero hero-gradient">
        <view class="hero-overlay"></view>
        <view class="hero-content">
          <text class="hero-title">云起天山</text>
          <text class="hero-subtitle">沿着丝路风景，开启一段辽阔而热烈的旅程</text>
          <view class="hero-badge">
            <text class="hero-badge-dot"></text>
            <text class="hero-badge-text">{{ destinationList.length }} 个精选景区</text>
          </view>
          <view class="hero-action-row">
            <view class="hero-ai-btn" @tap="openAiPlanner">问 AI 规划新疆行程</view>
            <view class="hero-hiking-btn" @tap="openHikingMode">进入徒步模式</view>
          </view>
        </view>
      </view>

      <view class="section stats-panel">
        <view class="stats-grid card">
          <view v-for="item in stats" :key="item.label" class="stat-item">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head">
          <text class="section-title">{{ featuredSectionTitle }}</text>
          <text class="link-text" @tap="goToDestinations">查看全部</text>
        </view>
        <view class="card-list">
          <view v-for="item in featuredDestinations" :key="item.id" class="card destination-card" @tap="openDetail(item.id)">
            <view class="image-wrap">
              <CachedImage :src="item.image" image-class="cover-image" />
              <view class="rating-badge">
                <text class="rating-star">*</text>
                <text class="rating-text">{{ item.rating }}</text>
              </view>
              <view class="enter-badge">查看详情</view>
            </view>
            <view class="destination-body">
              <text class="destination-title">{{ item.name }}</text>
              <text class="destination-meta muted-text">{{ item.location }}<text v-if="item.distanceText"> · {{ item.distanceText }}</text></text>
              <text class="destination-desc muted-text">{{ item.description }}</text>
              <view class="card-ai-link" @tap.stop="openAiForDestination(item)">问 AI 怎么玩</view>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head">
          <text class="section-title">小众推荐</text>
          <text class="muted-text niche-note">适合想避开常规热门点的人</text>
        </view>
        <view class="niche-list">
          <view v-for="item in nicheDestinations" :key="item.id" class="niche-card card" @tap="openDetail(item.id)">
            <view class="niche-head">
              <text class="niche-title">{{ item.name }}</text>
              <text class="niche-badge">{{ item.category }}</text>
            </view>
            <text class="destination-meta muted-text">{{ item.location }}</text>
            <text class="niche-desc muted-text">{{ item.description }}</text>
            <text class="niche-reason">{{ item.suggestion }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block last-block">
        <text class="section-title">热门玩法</text>
        <view class="activity-grid">
          <view v-for="item in activities" :key="item.title" class="activity-card" @tap="handleActivityTap(item)">
            <view class="activity-icon">{{ item.short }}</view>
            <text class="activity-title">{{ item.title }}</text>
            <text class="activity-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <AppTabBar current="/pages/home/index" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { destinationList, scenicCategories, scenicRegions } from '../../common/destination-data'
import { getCurrentLocation } from '../../services/amap'

const stats = [
  { value: `${destinationList.length}`, label: '景区总数' },
  { value: `${scenicCategories.length - 1}`, label: '景区分类' },
  { value: `${scenicRegions.length - 1}`, label: '覆盖地区' },
]

const currentCoords = ref(null)

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

const nicheDestinationIds = [63, 64, 65, 66, 67]

const nicheDestinations = computed(() => destinationList.filter((item) => nicheDestinationIds.includes(item.id)))

const activities = [
  { short: '丝', title: '丝路人文漫游', desc: '适合第一次探索新疆的人文路线' },
  { short: '沙', title: '沙漠越野探险', desc: '更偏向穿越和公路风景体验' },
  { short: '徒', title: '徒步模式', desc: '定位、离线地图、SOS 与露营风险提示', action: 'hiking' },
]

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

function goToDestinations() {
  uni.reLaunch({ url: '/pages/destinations/index' })
}

function openDetail(id) {
  uni.navigateTo({ url: `/pages/destination-detail/index?id=${id}` })
}

function openAiPlanner() {
  const featuredNames = featuredDestinations.value.map((item) => item.name).join('、')
  const context = [
    `首页推荐景区数：${destinationList.length}`,
    `景区分类数：${scenicCategories.length - 1}`,
    `覆盖地区数：${scenicRegions.length - 1}`,
    `当前推荐景区：${featuredNames || '天山天池、喀纳斯景区、赛里木湖'}`,
  ].join('\n')

  navigateToAiAssistant({
    title: '首页行程规划',
    desc: '结合首页推荐景区，快速生成第一次来新疆的旅行路线。',
    source: '首页',
    prompt: '我是第一次来新疆，请根据热门景区帮我规划 5 天行程。',
    context,
    autoAsk: true,
  })
}

function openHikingMode() {
  uni.navigateTo({ url: '/pages/hiking/index' })
}

function handleActivityTap(item) {
  if (item.action === 'hiking') {
    openHikingMode()
    return
  }

  uni.showToast({
    title: `${item.title} 敬请期待`,
    icon: 'none',
  })
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
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero {
  position: relative;
  height: 520rpx;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 58%);
}

.hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
  text-align: center;
  color: #ffffff;
}

.hero-title {
  font-size: 58rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 12rpx;
  font-size: 28rpx;
  opacity: 0.9;
}

.hero-badge {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 28rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  backdrop-filter: blur(8px);
}

.hero-badge-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ffffff;
}

.hero-badge-text {
  font-size: 24rpx;
}

.hero-ai-btn {
  min-width: 320rpx;
  height: 84rpx;
  padding: 0 34rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  color: $theme-color;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
}

.hero-action-row {
  margin-top: 26rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
}

.hero-hiking-btn {
  min-width: 300rpx;
  height: 84rpx;
  padding: 0 34rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.38);
  background: rgba(25, 23, 20, 0.18);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.stats-panel {
  margin-top: -54rpx;
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
  font-size: 40rpx;
  font-weight: 700;
  color: $theme-color;
}

.stat-label {
  margin-top: 8rpx;
  display: block;
  color: $theme-muted;
  font-size: 22rpx;
}

.section-block {
  margin-top: 40rpx;
}

.last-block {
  padding-bottom: 28rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.link-text {
  color: $theme-color;
  font-size: 24rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.niche-note {
  font-size: 22rpx;
}

.niche-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18rpx;
}

.niche-card {
  padding: 26rpx;
}

.niche-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.niche-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: $theme-text;
}

.niche-badge {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.1);
  color: $theme-color;
  font-size: 21rpx;
}

.niche-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.niche-reason {
  display: block;
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: $theme-color;
}

.destination-card {
  overflow: hidden;
  position: relative;
}

.image-wrap {
  position: relative;
  height: 360rpx;
}

.rating-badge {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
}

.enter-badge {
  position: absolute;
  left: 20rpx;
  bottom: 20rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
  font-size: 22rpx;
}

.rating-star {
  color: #f1a20b;
  font-size: 24rpx;
  font-weight: 700;
}

.rating-text {
  color: $theme-text;
  font-size: 24rpx;
}

.destination-body {
  padding: 28rpx;
}

.destination-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.destination-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
}

.destination-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.card-ai-link {
  margin-top: 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 68rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.1);
  color: $theme-color;
  font-size: 23rpx;
  font-weight: 600;
}

.activity-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.activity-card {
  padding: 28rpx 20rpx;
  border-radius: 28rpx;
  text-align: center;
  background: rgba(232, 168, 124, 0.18);
  border: 2rpx solid rgba(232, 168, 124, 0.4);
  min-height: 214rpx;
}

.activity-icon {
  width: 74rpx;
  height: 74rpx;
  margin: 0 auto 16rpx;
  border-radius: 24rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.activity-title {
  font-size: 24rpx;
}

.activity-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 21rpx;
  line-height: 1.6;
  color: $theme-muted;
}

@media screen and (max-width: 720rpx) {
  .activity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
