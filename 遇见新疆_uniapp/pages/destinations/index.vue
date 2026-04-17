<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient top-banner section">
        <text class="banner-title">探索新疆景区</text>
        <view class="search-box">
          <text class="search-mark">搜</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索景区、地区或分类..." />
        </view>
      </view>

      <view class="section category-panel card">
        <view class="category-panel-head">
          <text class="category-panel-title">景区分类</text>
          <text v-if="categories.length > defaultVisibleCount" class="category-toggle" @tap="toggleCategories">
            {{ categoriesExpanded ? '收起分类' : `展开全部 ${categories.length - 1} 类` }}
          </text>
        </view>
        <view class="category-grid">
          <view
            v-for="item in visibleCategories"
            :key="item"
            class="category-pill"
            :class="{ active: currentCategory === item }"
            @tap="currentCategory = item"
          >
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section category-panel card">
        <view class="category-panel-head">
          <text class="category-panel-title">所在地区</text>
          <text v-if="regions.length > defaultVisibleCount" class="category-toggle" @tap="toggleRegions">
            {{ regionsExpanded ? '收起地区' : `展开全部 ${regions.length - 1} 个地州` }}
          </text>
        </view>
        <view class="category-grid">
          <view
            v-for="item in visibleRegions"
            :key="item"
            class="category-pill region-pill"
            :class="{ active: currentRegion === item }"
            @tap="currentRegion = item"
          >
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section result-meta">
        <text class="muted-text">共找到 {{ filteredDestinations.length }} 个景区</text>
      </view>

      <view class="section card-list">
        <view v-for="item in filteredDestinations" :key="item.id" class="card destination-card" @tap="openDetail(item.id)">
          <view class="image-wrap">
            <CachedImage :src="item.image" image-class="cover-image" />
            <view class="tag-pill">{{ item.category }}</view>
            <view class="rating-badge">
              <text class="rating-star">*</text>
              <text>{{ item.rating }}</text>
            </view>
            <view class="enter-badge">查看详情</view>
          </view>
          <view class="card-body">
            <text class="card-title">{{ item.name }}</text>
            <text class="location muted-text">{{ item.location }}</text>
            <text class="card-desc muted-text">{{ item.description }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
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
const categoriesExpanded = ref(false)
const regionsExpanded = ref(false)
const defaultVisibleCount = 5

const destinations = ref(getLocalDestinationList())

const categories = computed(() => getDestinationCategories(destinations.value))
const regions = computed(() => getDestinationRegions(destinations.value))

const visibleCategories = computed(() => {
  const list = categories.value
  if (categoriesExpanded.value || list.length <= defaultVisibleCount) {
    return list
  }

  const compact = list.slice(0, defaultVisibleCount)
  if (compact.includes(currentCategory.value)) {
    return compact
  }

  return [list[0], currentCategory.value, ...list.slice(1, defaultVisibleCount - 1)]
})

const visibleRegions = computed(() => {
  const list = regions.value
  if (regionsExpanded.value || list.length <= defaultVisibleCount) {
    return list
  }

  const compact = list.slice(0, defaultVisibleCount)
  if (compact.includes(currentRegion.value)) {
    return compact
  }

  return [list[0], currentRegion.value, ...list.slice(1, defaultVisibleCount - 1)]
})

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

function toggleCategories() {
  categoriesExpanded.value = !categoriesExpanded.value
}

function toggleRegions() {
  regionsExpanded.value = !regionsExpanded.value
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.top-banner {
  padding-top: 88rpx;
  padding-bottom: 52rpx;
  color: #ffffff;
}

.banner-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 28rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
  height: 92rpx;
  border-radius: 28rpx;
  background: #ffffff;
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

.category-panel {
  margin: 28rpx 32rpx 8rpx;
  padding: 24rpx;
}

.category-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.category-panel-title {
  font-size: 30rpx;
  font-weight: 600;
}

.category-toggle {
  font-size: 24rpx;
  color: $theme-color;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 20rpx;
}

.region-pill {
  background: rgba(232, 168, 124, 0.08);
}

.category-pill {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  border: 2rpx solid $theme-border;
  background: #ffffff;
  color: $theme-text;
  font-size: 24rpx;
}

.category-pill.active {
  background: $theme-color;
  color: #ffffff;
  border-color: $theme-color;
}

.result-meta {
  padding-top: 20rpx;
  padding-bottom: 12rpx;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.destination-card {
  overflow: hidden;
}

.image-wrap {
  position: relative;
  height: 360rpx;
}

.tag-pill {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  font-size: 22rpx;
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
  background: rgba(255, 255, 255, 0.92);
  font-size: 22rpx;
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
  font-weight: 700;
}

.card-body {
  padding: 28rpx;
}

.card-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.location,
.card-desc {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
}

.location {
  margin-top: 12rpx;
}

.card-desc {
  margin-top: 8rpx;
}
</style>
