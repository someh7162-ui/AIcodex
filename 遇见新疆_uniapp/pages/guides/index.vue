<template>
  <view class="page-shell">
    <view class="page-scroll">
      <view class="hero-gradient top-banner section">
        <text class="banner-title">旅行指南</text>
        <text class="banner-subtitle">行前准备、玩法建议与新疆旅行常识都在这里</text>
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
        <text class="section-title">精选攻略</text>
        <view class="guide-list">
          <view v-for="item in guides" :key="item.id" class="card guide-card">
            <view class="guide-image-wrap">
              <CachedImage :src="item.image" image-class="cover-image" />
              <view class="guide-tag">{{ item.category }}</view>
            </view>
            <view class="guide-body">
              <text class="guide-title">{{ item.title }}</text>
              <text class="guide-desc muted-text">{{ item.excerpt }}</text>
              <text class="guide-time muted-text">{{ item.readTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="info-panel">
          <text class="section-title">旅行基础信息</text>
          <view class="info-list">
            <view v-for="item in essentialInfo" :key="item.label" class="info-row">
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
import AppTabBar from '../../components/AppTabBar.vue'
import CachedImage from '../../components/CachedImage.vue'

const quickTips = [
  {
    short: '季',
    title: '最佳季节',
    description: '5 月到 10 月更适合出行，天气舒适、景色层次也更丰富。',
  },
  {
    short: '语',
    title: '语言沟通',
    description: '准备一些常用普通话表达，部分地区也能接触到维吾尔语。',
  },
  {
    short: '费',
    title: '预算规划',
    description: '常规出行建议按每日 300 到 700 元预估住宿、餐饮与交通。',
  },
]

const guides = [
  {
    id: 1,
    title: '什么时候最适合去新疆',
    category: '行程规划',
    readTime: '5 分钟阅读',
    image: 'https://images.unsplash.com/photo-1698253542757-dcafef34a137?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxLYW5hcyUyMGxha2UlMjBhdXR1bW4lMjBsYW5kc2NhcGV8ZW58MXx8fHwxNzc2MjQ2MzMzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    excerpt: '按季节挑选目的地，提前避开极端天气和旺季高峰，旅程会更轻松。',
  },
  {
    id: 2,
    title: '丝路美食不踩雷指南',
    category: '吃喝推荐',
    readTime: '8 分钟阅读',
    image: 'https://images.unsplash.com/photo-1756363886854-b51467278a52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXphYXIlMjBtYXJrZXQlMjBzcGljZXMlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzYyNDYzMzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    excerpt: '从抓饭、烤包子到羊肉串，帮你快速找到新疆旅行中的高频美味。',
  },
  {
    id: 3,
    title: '沙漠穿越安全提醒',
    category: '安全提示',
    readTime: '6 分钟阅读',
    image: 'https://images.unsplash.com/photo-1623336343731-1582577b8250?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUYWtsYW1ha2FuJTIwZGVzZXJ0JTIwc2FuZCUyMGR1bmVzfGVufDF8fHx8MTc3NjI0NjMzMnww&ixlib=rb-4.1.0&q=80&w=1080',
    excerpt: '做好补水、防晒和路线确认，沙漠项目更需要团队协作与专业安排。',
  },
  {
    id: 4,
    title: '天山徒步装备清单',
    category: '户外探险',
    readTime: '7 分钟阅读',
    image: 'https://images.unsplash.com/photo-1766823282156-7e2de7f9f922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaWFuY2hpJTIwaGVhdmVubHklMjBsYWtlJTIwWGluamlhbmclMjBtb3VudGFpbnN8ZW58MXx8fHwxNzc2MjQ2MzMxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    excerpt: '保暖、鞋服、路餐和应急物资缺一不可，高海拔徒步更要提前准备。',
  },
]

const essentialInfo = [
  { label: '货币', value: '人民币（CNY）' },
  { label: '时区', value: 'UTC+8，北京时间' },
  { label: '语言', value: '普通话、维吾尔语、哈萨克语等' },
  { label: '气候', value: '大陆性气候明显，夏季较热、昼夜温差较大' },
]
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
}

.tips-shell {
  padding-top: 36rpx;
}

.tips-list,
.guide-list {
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

.tip-content,
.guide-body {
  display: flex;
  flex-direction: column;
}

.tip-title,
.guide-title {
  font-size: 30rpx;
  font-weight: 600;
}

.tip-desc,
.guide-desc,
.guide-time {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.section-block {
  margin-top: 40rpx;
}

.guide-card {
  overflow: hidden;
}

.guide-image-wrap {
  position: relative;
  height: 300rpx;
}

.guide-tag {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  font-size: 22rpx;
}

.guide-body {
  padding: 26rpx;
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
