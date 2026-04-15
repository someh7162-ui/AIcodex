<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient top-banner section">
        <text class="banner-title">攻略指南</text>
        <text class="banner-subtitle">先看预览，再点进详情，后面也能无缝切到接口数据</text>
      </view>

      <view class="tips-shell section">
        <text class="section-title">出发前速览</text>
        <view class="tips-list">
          <view v-for="item in quickTips" :key="item.title" class="card tip-item">
            <view class="tip-icon">{{ item.short }}</view>
            <view class="tip-content">
              <text class="tip-title">{{ item.title }}</text>
              <text class="tip-desc muted-text">{{ item.description }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head">
          <text class="section-title">精选攻略预览</text>
          <text class="section-note">仿信息流预览，点击即可查看详情</text>
        </view>

        <view class="guide-feed">
          <view v-for="item in guides" :key="item.id" class="card feed-card" @tap="openGuide(item.id)">
            <view class="feed-top">
              <view class="author-badge">攻</view>
              <view class="feed-top-text">
                <text class="feed-author">{{ item.author }}</text>
                <text class="feed-meta muted-text">{{ item.publishDate }} · {{ item.location }}</text>
              </view>
              <view class="feed-tag">{{ item.category }}</view>
            </view>

            <view class="feed-body">
              <view class="feed-copy">
                <text class="feed-title">{{ item.title }}</text>
                <text class="feed-desc muted-text">{{ item.excerpt }}</text>

                <view class="highlight-list">
                  <text v-for="tag in item.highlights" :key="tag" class="highlight-chip"># {{ tag }}</text>
                </view>
              </view>

              <view class="feed-image-wrap">
                <CachedImage :src="item.image" image-class="cover-image" />
              </view>
            </view>

            <view class="feed-footer">
              <text class="feed-stat">{{ item.readTime }}</text>
              <text class="feed-stat">浏览 {{ item.views }}</text>
              <text class="feed-stat">收藏感 {{ item.likes }}</text>
              <text class="feed-link">查看详情</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="info-panel">
          <text class="section-title">接口预留说明</text>
          <view class="info-list">
            <view v-for="item in interfaceNotes" :key="item.label" class="info-row">
              <view class="info-dot"></view>
              <text class="info-text">
                <text class="info-label">{{ item.label }}:</text>
                <text class="muted-text"> {{ item.value }}</text>
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <AppTabBar current="/pages/guides/index" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'
import { getGuideFeed } from '../../services/guides'

const quickTips = [
  {
    short: '线',
    title: '先定线路',
    description: '新疆范围大，先定北疆、伊犁、南疆还是自驾线，再去补景点。',
  },
  {
    short: '住',
    title: '先锁住宿',
    description: '旺季核心景区房量紧，先锁住关键夜晚，比后面再补更稳。',
  },
  {
    short: '安',
    title: '重视安全',
    description: '山口、沙漠、长途自驾和昼夜温差，都是新疆出行里最常见的变量。',
  },
]

const interfaceNotes = [
  { label: '列表接口', value: '已预留 `getGuideFeed()`，当前先走本地数据，后续可直接切接口' },
  { label: '详情接口', value: '已预留 `getGuideDetail(id)`，详情页已按接口返回结构设计' },
  { label: '当前策略', value: '先用原创攻略占位，后面接你自己的内容源或后台都方便' },
]

const guides = ref([])

onShow(async () => {
  guides.value = await getGuideFeed()
})

function openGuide(id) {
  uni.navigateTo({
    url: `/pages/guide-detail/index?id=${encodeURIComponent(id)}`,
  })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.top-banner {
  padding-top: 88rpx;
  padding-bottom: 48rpx;
  color: #ffffff;
}

.banner-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
}

.banner-subtitle {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  opacity: 0.9;
  line-height: 1.6;
}

.tips-shell {
  padding-top: 36rpx;
}

.tips-list,
.guide-feed {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-top: 24rpx;
}

.tip-item {
  display: flex;
  gap: 24rpx;
  padding: 26rpx;
  align-items: flex-start;
}

.tip-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 24rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.tip-content {
  display: flex;
  flex-direction: column;
}

.tip-title,
.feed-title {
  font-size: 30rpx;
  font-weight: 600;
}

.tip-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.section-block {
  margin-top: 40rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
}

.section-note {
  font-size: 22rpx;
  color: $theme-muted;
}

.feed-card {
  padding: 24rpx;
}

.feed-top {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.author-badge {
  width: 68rpx;
  height: 68rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #c44536, #e29b52);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.feed-top-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.feed-author {
  font-size: 26rpx;
  font-weight: 600;
}

.feed-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
}

.feed-tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  font-size: 22rpx;
  flex-shrink: 0;
}

.feed-body {
  margin-top: 22rpx;
  display: flex;
  gap: 20rpx;
}

.feed-copy {
  flex: 1;
  min-width: 0;
}

.feed-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.highlight-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.highlight-chip {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.16);
  color: #9b5b2a;
  font-size: 22rpx;
}

.feed-image-wrap {
  width: 208rpx;
  height: 208rpx;
  overflow: hidden;
  border-radius: 24rpx;
  flex-shrink: 0;
}

.feed-footer {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 22rpx;
  font-size: 22rpx;
  color: $theme-muted;
  flex-wrap: wrap;
}

.feed-link {
  margin-left: auto;
  color: $theme-color;
  font-weight: 600;
}

.info-panel {
  padding: 32rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.18);
  border: 2rpx solid rgba(232, 168, 124, 0.4);
}

.info-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.info-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: $theme-color;
  flex-shrink: 0;
}

.info-text {
  font-size: 24rpx;
  line-height: 1.6;
}

.info-label {
  color: $theme-text;
}
</style>
