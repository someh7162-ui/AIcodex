<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient top-banner section atlas-hero">
        <view class="hero-overlay"></view>
        <view class="banner-content">
          <text class="section-kicker">Curated Atlas</text>
          <text class="banner-title">探索新疆景区</text>
          <text class="banner-subtitle">把草原、峡谷、湖泊与胡杨林，收进一份可以慢慢翻阅的目的地清单。</text>
          <view class="search-box">
            <text class="search-mark">搜</text>
            <input v-model="searchQuery" class="search-input" placeholder="搜索景区、地区或分类..." />
          </view>
        </view>
      </view>

      <view class="section section-block result-panel atlas-panel floating-panel">
        <view class="toolbar-row">
          <view class="section-copy">
            <text class="section-kicker secondary-kicker">Destination Feed</text>
            <text class="section-title editorial-title">{{ currentCategory === '全部' && currentRegion === '全部' ? '全部目的地' : '筛选结果' }}</text>
          </view>
          <view class="filter-trigger" @tap="openFilterPanel">
            <text class="filter-icon">筛</text>
            <text>筛选</text>
          </view>
        </view>

        <view class="active-filters" v-if="currentCategory !== '全部' || currentRegion !== '全部'">
          <view v-if="currentCategory !== '全部'" class="active-chip" @tap="currentCategory = '全部'">
            <text>{{ currentCategory }}</text>
            <text class="chip-close">×</text>
          </view>
          <view v-if="currentRegion !== '全部'" class="active-chip" @tap="currentRegion = '全部'">
            <text>{{ currentRegion }}</text>
            <text class="chip-close">×</text>
          </view>
        </view>

        <view class="result-meta-row">
          <text class="muted-text">共找到 {{ filteredDestinations.length }} 个景区</text>
          <text v-if="searchQuery" class="muted-text">关键词：{{ searchQuery }}</text>
        </view>

        <view v-if="filteredDestinations.length" class="featured-list waterfall-grid">
          <view class="waterfall-column">
            <view v-for="item in destinationColumns.left" :key="item.id" class="destination-card editorial-card" @tap="openDetail(item.id)">
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
                <view class="editorial-chip-row">
                  <text class="editorial-info-chip">{{ item.category }}</text>
                  <text class="editorial-info-chip editorial-info-chip-soft">{{ item.region }}</text>
                </view>
                <view class="meta-row editorial-meta-row">
                  <text class="icon-location">📍</text>
                  <text class="destination-meta">{{ item.location }}</text>
                </view>
                <text class="destination-desc-short">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <view class="waterfall-column">
            <view v-for="item in destinationColumns.right" :key="item.id" class="destination-card editorial-card" @tap="openDetail(item.id)">
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
                <view class="editorial-chip-row">
                  <text class="editorial-info-chip">{{ item.category }}</text>
                  <text class="editorial-info-chip editorial-info-chip-soft">{{ item.region }}</text>
                </view>
                <view class="meta-row editorial-meta-row">
                  <text class="icon-location">📍</text>
                  <text class="destination-meta">{{ item.location }}</text>
                </view>
                <text class="destination-desc-short">{{ item.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <text class="empty-state-title">暂时没有匹配的目的地</text>
          <text class="empty-state-copy">换个关键词，或在筛选面板里重置分类与地区试试。</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <view v-if="showFilterPanel" class="filter-mask" @tap="closeFilterPanel">
      <view class="filter-panel" @tap.stop>
        <view class="filter-panel-head">
          <text class="filter-panel-title">筛选目的地</text>
          <text class="filter-panel-close" @tap="closeFilterPanel">×</text>
        </view>

        <view class="filter-group">
          <text class="filter-group-title">景区分类</text>
          <view class="filter-chip-grid">
            <view
              v-for="item in categories"
              :key="item"
              class="filter-chip"
              :class="{ active: currentCategory === item }"
              @tap="currentCategory = item"
            >
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="filter-group">
          <text class="filter-group-title">所在地区</text>
          <view class="filter-chip-grid">
            <view
              v-for="item in regions"
              :key="item"
              class="filter-chip region-chip"
              :class="{ active: currentRegion === item }"
              @tap="currentRegion = item"
            >
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="filter-actions">
          <view class="filter-reset-btn" @tap="resetFilters">重置</view>
          <view class="filter-apply-btn" @tap="closeFilterPanel">查看结果</view>
        </view>
      </view>
    </view>

    <AppTabBar current="/pages/destinations/index" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import {
  getDestinationCategories,
  getDestinationFeed,
  getDestinationRegions,
  getLocalDestinationList,
} from '../../services/destinations'

const searchQuery = ref('')
const currentCategory = ref('全部')
const currentRegion = ref('全部')
const showFilterPanel = ref(false)

const destinations = ref(getLocalDestinationList())

const categories = computed(() => getDestinationCategories(destinations.value))
const regions = computed(() => getDestinationRegions(destinations.value))

const filteredDestinations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return destinations.value.filter((item) => {
    const matchesCategory = currentCategory.value === '全部' || item.category === currentCategory.value
    const matchesRegion = currentRegion.value === '全部' || item.region === currentRegion.value
    const searchText = [item.name, item.location, item.region, item.category].join(' ').toLowerCase()
    const matchesSearch = !query || searchText.includes(query)
    return matchesCategory && matchesRegion && matchesSearch
  })
})

const destinationColumns = computed(() => splitAlternatingColumns(filteredDestinations.value))

onShow(async () => {
  destinations.value = await getDestinationFeed()

  if (!categories.value.includes(currentCategory.value)) {
    currentCategory.value = '全部'
  }

  if (!regions.value.includes(currentRegion.value)) {
    currentRegion.value = '全部'
  }
})

function openDetail(id) {
  uni.navigateTo({ url: `/pages/destination-detail/index?id=${id}` })
}

function openFilterPanel() {
  showFilterPanel.value = true
}

function closeFilterPanel() {
  showFilterPanel.value = false
}

function resetFilters() {
  currentCategory.value = '全部'
  currentRegion.value = '全部'
}

function openAiForDestination(item) {
  const context = [
    `景区名称：${item.name}`,
    `所在地区：${item.location}`,
    `景区分类：${item.category}`,
    `景区介绍：${item.description}`,
    `适合玩法：${item.suggestion || '可结合当地路线灵活安排'}`,
    `游玩提示：${Array.isArray(item.tips) && item.tips.length ? item.tips.join('；') : '建议根据季节和天气提前确认开放信息'}`,
  ].join('\n')

  navigateToAiAssistant({
    title: item.name,
    desc: item.description,
    source: '目的地页',
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

.page-scroll {
  background: #faf9f5;
}

.top-banner {
  position: relative;
  overflow: hidden;
  padding-top: 102rpx;
  padding-bottom: 220rpx;
  color: #ffffff;
}

.atlas-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('https://bkimg.cdn.bcebos.com/pic/3b6833f59a17901bbd31090c?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70');
  background-size: cover;
  background-position: center 34%;
  opacity: 0.55;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(70, 28, 20, 0.26) 0%, rgba(70, 28, 20, 0.1) 64%, rgba(250, 249, 245, 0) 100%);
}

.banner-content {
  position: relative;
  z-index: 1;
}

.section-kicker {
  display: block;
  color: rgba(255, 240, 220, 0.92);
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 7rpx;
  text-transform: uppercase;
}

.secondary-kicker {
  color: #825500;
}

.banner-title {
  display: block;
  margin-top: 16rpx;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 58rpx;
  font-style: italic;
  font-weight: 900;
  line-height: 1.08;
}

.banner-subtitle {
  display: block;
  max-width: 620rpx;
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: rgba(255, 247, 238, 0.92);
}

.search-box {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  height: 92rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  color: $theme-text;
}

.search-mark {
  width: 40rpx;
  text-align: center;
  color: $theme-muted;
  font-weight: 700;
}

.search-input {
  flex: 1;
  height: 92rpx;
}

.section-block {
  margin-top: 56rpx;
}

.floating-panel {
  position: relative;
  margin: -132rpx 24rpx 0;
  z-index: 4;
}

.atlas-panel {
  position: relative;
  padding: 42rpx 28rpx;
  border-radius: 36rpx;
  background: #ffffff;
  border: 2rpx solid rgba(162, 45, 33, 0.06);
  box-shadow: 0 20rpx 46rpx rgba(27, 28, 26, 0.08);
  overflow: hidden;
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

.toolbar-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
}

.section-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.section-title {
  display: block;
}

.editorial-title {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.14;
  color: #1b1c1a;
}

.filter-trigger {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 24rpx;
  min-height: 76rpx;
  border-radius: 20rpx;
  background: #a22d21;
  color: #fffaf6;
  font-size: 24rpx;
  font-weight: 700;
}

.filter-icon {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 22rpx;
}

.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(162, 45, 33, 0.08);
  color: #a22d21;
  font-size: 22rpx;
  font-weight: 700;
}

.chip-close {
  font-size: 24rpx;
}

.result-meta-row {
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.featured-list {
  margin-top: 30rpx;
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
  gap: 32rpx;
}

.editorial-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 32rpx rgba(27, 28, 26, 0.06);
}

.editorial-media-wrap {
  padding: 0;
}

.editorial-image {
  height: 420rpx;
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

.rating-badge-glass {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 100rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.icon-star {
  color: #f1a20b;
  font-size: 20rpx;
}

.rating-num {
  color: #1b1c1a;
  font-size: 24rpx;
  font-weight: 700;
}

.destination-body {
  padding: 28rpx 20rpx 22rpx;
}

.editorial-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.editorial-info-chip {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.08);
  color: #8d372c;
  font-size: 19rpx;
  font-weight: 700;
}

.editorial-info-chip-soft {
  background: rgba(232, 168, 124, 0.12);
  color: #7c5a43;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 12rpx;
}

.destination-title {
  flex: 1;
  display: block;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.25;
  color: #1b1c1a;
}

.mini-ai-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 14rpx;
  border-radius: 12rpx;
  background: rgba(196, 69, 54, 0.08);
  color: #c44536;
  font-size: 19rpx;
  font-weight: 700;
}

.icon-sparkle {
  font-size: 18rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.icon-location {
  flex-shrink: 0;
  font-size: 24rpx;
}

.destination-meta {
  display: block;
  font-size: 22rpx;
  line-height: 1.6;
  color: #58413e;
}

.destination-desc-short {
  display: block;
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.8;
  color: #58413e;
}

.empty-state {
  padding: 54rpx 28rpx 40rpx;
  border-radius: 28rpx;
  background: rgba(250, 246, 239, 0.88);
  border: 2rpx dashed rgba(162, 45, 33, 0.12);
  text-align: center;
}

.empty-state-title {
  display: block;
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 36rpx;
  font-weight: 700;
  color: #1b1c1a;
}

.empty-state-copy {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: #58413e;
}

.filter-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(27, 28, 26, 0.34);
  backdrop-filter: blur(8rpx);
}

.filter-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 620rpx;
  max-width: calc(100vw - 80rpx);
  height: 100%;
  padding: 90rpx 28rpx 180rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: -24rpx 0 48rpx rgba(27, 28, 26, 0.12);
  overflow-y: auto;
}

.filter-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.filter-panel-title {
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: 40rpx;
  font-weight: 800;
  color: #1b1c1a;
}

.filter-panel-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: rgba(162, 45, 33, 0.08);
  color: #a22d21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
}

.filter-group {
  margin-top: 34rpx;
}

.filter-group-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1b1c1a;
}

.filter-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.filter-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 2rpx solid rgba(162, 45, 33, 0.12);
  color: #58413e;
  font-size: 23rpx;
}

.filter-chip.active {
  background: #a22d21;
  border-color: #a22d21;
  color: #ffffff;
}

.region-chip {
  background: rgba(232, 168, 124, 0.08);
}

.filter-actions {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  bottom: 36rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.filter-reset-btn,
.filter-apply-btn {
  min-height: 84rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

.filter-reset-btn {
  background: rgba(162, 45, 33, 0.08);
  color: #a22d21;
}

.filter-apply-btn {
  background: #a22d21;
  color: #ffffff;
}

@media screen and (max-width: 720rpx) {
  .top-banner {
    padding-top: 92rpx;
    padding-bottom: 196rpx;
  }

  .banner-title {
    font-size: 50rpx;
  }

  .banner-subtitle {
    font-size: 24rpx;
  }

  .floating-panel {
    margin: -116rpx 20rpx 0;
  }

  .atlas-panel {
    padding: 32rpx 22rpx;
    border-radius: 30rpx;
  }

  .toolbar-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-meta-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .featured-list {
    gap: 18rpx;
  }

  .waterfall-column {
    gap: 24rpx;
  }

  .editorial-image {
    height: 320rpx;
  }

  .title-row {
    flex-direction: column;
    gap: 10rpx;
  }

  .editorial-chip-row {
    gap: 8rpx;
  }

  .destination-title {
    font-size: 34rpx;
  }

  .destination-desc-short {
    font-size: 22rpx;
  }

  .filter-panel {
    width: 100vw;
    max-width: 100vw;
    padding: 86rpx 22rpx 180rpx;
  }
}
</style>
