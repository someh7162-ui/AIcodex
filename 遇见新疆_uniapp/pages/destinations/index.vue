<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient top-banner section">
        <text class="banner-title">探索目的地</text>
        <view class="search-box">
          <text class="search-mark">搜</text>
          <input v-model="searchQuery" class="search-input" placeholder="搜索你想去的新疆风景..." />
        </view>
      </view>

      <scroll-view scroll-x class="category-strip" show-scrollbar="false">
        <view class="category-row">
          <view
            v-for="item in categories"
            :key="item"
            class="category-pill"
            :class="{ active: currentCategory === item }"
            @tap="currentCategory = item"
          >
            <text>{{ item }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="section result-meta">
        <text class="muted-text">共找到 {{ filteredDestinations.length }} 个目的地</text>
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
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { destinationList } from '../../common/destination-data'

const searchQuery = ref('')
const currentCategory = ref('全部')

const categories = ['全部', '自然风光', '人文古城', '探险穿越', '市集烟火']

const destinations = destinationList

const filteredDestinations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return destinations.filter((item) => {
    const matchesCategory = currentCategory.value === '全部' || item.category === currentCategory.value
    const matchesSearch = !query || item.name.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })
})

function openDetail(id) {
  uni.navigateTo({ url: `/pages/destination-detail/index?id=${id}` })
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

.category-strip {
  white-space: nowrap;
  padding: 28rpx 0 8rpx;
}

.category-row {
  display: inline-flex;
  gap: 18rpx;
  padding: 0 32rpx;
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
