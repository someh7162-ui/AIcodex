<template>
  <view class="page-shell">
    <view v-if="guide" class="page-scroll">
      <view class="hero-card">
        <CachedImage :src="guide.image" image-class="cover-image" />
        <view class="hero-mask"></view>
        <view class="detail-topbar">
          <view class="back-btn" @tap="goBack"><text>返回</text></view>
        </view>
        <view class="hero-info">
          <view class="hero-tag">{{ guide.category }}</view>
          <text class="hero-title">{{ guide.title }}</text>
          <text class="hero-meta">{{ guide.author }} · {{ guide.publishDate }} · {{ guide.readTime }}</text>
          <text class="hero-desc">{{ guide.excerpt }}</text>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">攻略亮点</text>
        <view class="highlight-list">
          <view v-for="item in guide.highlights" :key="item" class="highlight-item card-lite"># {{ item }}</view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">正文详情</text>
        <view class="content-card card">
          <view v-for="section in guide.sections" :key="section.title" class="content-section">
            <text class="content-title">{{ section.title }}</text>
            <text v-for="paragraph in section.paragraphs" :key="paragraph" class="content-paragraph">{{ paragraph }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">实用提醒</text>
        <view class="tips-list">
          <view v-for="tip in guide.tips" :key="tip" class="tip-card card">
            <view class="tip-dot"></view>
            <text class="tip-text">{{ tip }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="info-panel">
          <text class="section-title">接口预留</text>
          <text class="info-copy muted-text">当前详情页通过 `getGuideDetail(id)` 获取数据，后续接你自己的内容接口时，保留 `id/title/image/excerpt/highlights/sections/tips` 这些字段即可直接复用。</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

    <view v-else class="empty-shell section">
      <text class="section-title">攻略不存在</text>
      <view class="primary-btn narrow-btn" @tap="goBack">返回上一页</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { getGuideDetail } from '../../services/guides'

const guide = ref(null)

onLoad(async (options) => {
  const id = options?.id || ''
  guide.value = await getGuideDetail(id)
})

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({ url: '/pages/guides/index' })
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero-card {
  position: relative;
  height: 520rpx;
  overflow: hidden;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 17, 17, 0.08), rgba(17, 17, 17, 0.68));
}

.detail-topbar {
  position: absolute;
  top: 78rpx;
  left: 24rpx;
  right: 24rpx;
  z-index: 2;
}

.back-btn {
  width: 112rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12rpx);
}

.hero-info {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 36rpx;
  z-index: 2;
  color: #ffffff;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  font-size: 22rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.3;
}

.hero-meta,
.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  opacity: 0.94;
}

.section-block {
  margin-top: 36rpx;
}

.highlight-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}

.highlight-item {
  padding: 16rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #9b5b2a;
  background: rgba(232, 168, 124, 0.16);
}

.content-card {
  margin-top: 24rpx;
  padding: 30rpx;
}

.card-lite {
  border: 2rpx solid rgba(196, 69, 54, 0.12);
  box-shadow: none;
}

.content-section + .content-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid rgba(15, 23, 42, 0.06);
}

.content-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
}

.content-paragraph {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 1.9;
  color: $theme-text;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.tip-card {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  padding: 24rpx;
}

.tip-dot {
  width: 14rpx;
  height: 14rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: $theme-color;
  flex-shrink: 0;
}

.tip-text {
  font-size: 25rpx;
  line-height: 1.7;
  color: $theme-text;
}

.info-panel {
  padding: 32rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.18);
  border: 2rpx solid rgba(232, 168, 124, 0.4);
}

.info-copy {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  line-height: 1.8;
}

.primary-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.empty-shell {
  padding-top: 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.narrow-btn {
  margin-top: 28rpx;
  width: 240rpx;
}
</style>
