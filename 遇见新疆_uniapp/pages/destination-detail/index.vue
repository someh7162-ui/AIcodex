<template>
  <view class="page-shell">
    <view v-if="destination" class="page-scroll">
      <view class="hero-card">
        <CachedImage :src="destination.image" image-class="cover-image" />
        <view class="hero-mask"></view>
        <view class="detail-topbar">
          <view class="back-btn" @tap="goBack"><text>返回</text></view>
        </view>
        <view class="hero-info">
          <view class="category-chip">{{ destination.category }}</view>
          <text class="hero-title">{{ destination.name }}</text>
          <text class="hero-location">{{ destination.location }}</text>
          <text class="hero-desc">{{ destination.description }}</text>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head-row">
          <text class="section-title">景区介绍</text>
          <view v-if="hasExtendedCulture" class="section-toggle-chip" @tap="introExpanded = !introExpanded">
            {{ introExpanded ? '收起' : '展开更多' }}
          </view>
        </view>
        <view class="story-card card">
          <view class="travel-meta-grid">
            <view class="travel-meta-item">
              <text class="travel-meta-label">推荐季节</text>
              <text class="travel-meta-value">{{ destinationTravelMeta.season }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">建议停留</text>
              <text class="travel-meta-value">{{ destinationTravelMeta.stay }}</text>
            </view>
            <view class="travel-meta-item full-width">
              <text class="travel-meta-label">适合人群</text>
              <text class="travel-meta-value">{{ destinationTravelMeta.audience }}</text>
            </view>
          </view>
          <view class="visit-meta-grid">
            <view class="travel-meta-item">
              <text class="travel-meta-label">门票参考</text>
              <text class="travel-meta-value">{{ destinationVisitMeta.ticket }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">开放时间</text>
              <text class="travel-meta-value">{{ destinationVisitMeta.openHours }}</text>
            </view>
          </view>
          <view class="story-row">
            <text class="story-label">景区概览</text>
            <text class="story-text">{{ destinationCulture.overview }}</text>
          </view>
          <view v-if="introExpanded" class="story-row">
            <text class="story-label">历史由来</text>
            <text class="story-text">{{ destinationCulture.history }}</text>
          </view>
          <view v-if="introExpanded" class="story-row last-row">
            <text class="story-label">值得了解</text>
            <text class="story-text">{{ destinationCulture.highlights }}</text>
          </view>
        </view>
      </view>

      <view v-if="relatedGuidesVisible" class="section section-block">
        <view class="section-head-row">
          <text class="section-title">相关攻略</text>
          <view v-if="relatedGuides.length > 2" class="section-toggle-chip" @tap="showAllRelatedGuides = !showAllRelatedGuides">
            {{ showAllRelatedGuides ? '收起' : `展开全部 ${relatedGuides.length} 条` }}
          </view>
        </view>
        <view class="related-guides-card card">
          <view class="related-guides-head">
            <view>
              <text class="map-title">来自攻略指南的相关内容</text>
              <text class="map-subtitle muted-text">进入景区详情后，这里会自动匹配所有用户发布的相关攻略，方便你直接继续看别人的实地经验。</text>
            </view>
            <view v-if="relatedGuidesLoading" class="offline-status">加载中</view>
          </view>

          <view v-if="relatedGuides.length" class="related-guides-list">
            <view v-for="guide in visibleRelatedGuides" :key="guide.id" class="related-guide-item card-lite" @tap="openRelatedGuide(guide.id)">
              <view class="related-guide-cover">
                <CachedImage v-if="guide.image" :src="guide.image" image-class="cover-image" />
                <view v-else class="related-guide-cover-fallback">
                  <text>攻略</text>
                </view>
              </view>
              <view class="related-guide-body">
                <text class="related-guide-title">{{ guide.title }}</text>
                <text class="related-guide-meta muted-text">{{ guide.nickname || guide.author }} · {{ guide.locationTag || guide.location || '新疆同城' }}</text>
                <text class="related-guide-summary muted-text">{{ guide.excerpt || guide.summaryText || '这条攻略还没有补充摘要，点进去看完整内容。' }}</text>
                <view class="related-guide-foot">
                  <text class="related-guide-stat">{{ guide.contentType || '图文' }}</text>
                  <text class="related-guide-stat">{{ guide.publishDate || '' }}</text>
                </view>
              </view>
            </view>
            <view v-if="relatedGuides.length > 2" class="list-toggle-inline" @tap="showAllRelatedGuides = !showAllRelatedGuides">
              {{ showAllRelatedGuides ? '收起相关攻略' : '查看更多相关攻略' }}
            </view>
          </view>

          <view v-else-if="relatedGuidesError" class="map-fallback">
            <text class="map-fallback-title">相关攻略加载失败</text>
            <text class="map-fallback-desc muted-text">{{ relatedGuidesError }}</text>
          </view>

          <view v-else class="map-fallback">
            <text class="map-fallback-title">暂时没有相关攻略</text>
            <text class="map-fallback-desc muted-text">等用户发布包含这个景区名称或相关地点标签的攻略后，这里会自动显示。</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <text class="section-title">路线与天气</text>
        <view class="map-card card">
          <view class="map-head">
            <view>
              <text class="map-title">景区位置、路线与天气</text>
              <text class="map-subtitle muted-text">把导航距离、出发方式和当地天气合并到一块，出发前先看这一屏就够了。</text>
            </view>
            <view class="map-status" :class="{ ready: locationReady }">{{ locationStatusText }}</view>
          </view>

          <view class="travel-overview-grid">
            <view class="travel-overview-card card-lite">
              <text class="travel-overview-label">当前天气</text>
              <text class="travel-overview-value weather-emphasis">{{ liveWeather.temperature }}</text>
              <text class="travel-overview-sub muted-text">{{ liveWeather.condition }}</text>
            </view>
            <view class="travel-overview-card card-lite">
              <text class="travel-overview-label">空气湿度</text>
              <text class="travel-overview-value">{{ liveWeather.humidity }}</text>
              <text class="travel-overview-sub muted-text">风力 {{ liveWeather.wind }}</text>
            </view>
          </view>

          <view class="location-meta">
            <text class="meta-label">景区位置</text>
            <text class="meta-value">{{ scenicLocationText }}</text>
          </view>
          <view class="location-meta scenic-meta">
            <text class="meta-label">路线方式</text>
            <view class="route-mode-group">
              <view
                v-for="item in routeModeOptions"
                :key="item.value"
                class="route-mode-chip"
                :class="{ active: routeMode === item.value }"
                @tap="changeRouteMode(item.value)"
              >
                {{ item.label }}
              </view>
            </view>
          </view>
          <view class="route-summary card-lite scenic-meta">
            <view class="route-summary-item">
              <text class="meta-label">预计时间</text>
              <text class="route-highlight">{{ routeDurationText }}</text>
            </view>
            <view class="route-summary-item">
              <text class="meta-label">预计距离</text>
              <text class="route-highlight">{{ routeDistanceText }}</text>
            </view>
            <view v-if="routeMode === 'taxi'" class="route-summary-item route-summary-wide">
              <text class="meta-label">打车预估</text>
              <text class="meta-value">{{ taxiCostText }}</text>
            </view>
          </view>

          <view v-if="mapImageUrl" class="map-preview">
            <CachedImage :src="mapImageUrl" image-class="cover-image" />
          </view>
          <view v-else class="map-fallback">
            <text class="map-fallback-title">等待高德地图 Key</text>
            <text class="map-fallback-desc muted-text">填入高德 Web 服务 Key 后，这里会显示景区静态地图并支持驾车时间估算。</text>
          </view>

          <view class="map-actions">
            <view class="primary-btn" @tap="openScenicLocation">地图导航</view>
            <view class="secondary-btn" @tap="refreshLocationAndWeather">刷新路线</view>
          </view>

          <text v-if="weatherError" class="weather-note travel-weather-note">{{ weatherError }}</text>
          <text v-else-if="!hasRealWeather" class="weather-note travel-weather-note">当前显示的是本地预设天气，填入高德 Key 后会自动切换为实时天气。</text>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head-row">
          <text class="section-title">导览攻略</text>
          <view class="section-toggle-chip guide-chip" @tap="guideExpanded = !guideExpanded">
            {{ guideExpanded ? '收起' : '展开' }}
          </view>
        </view>
        <view class="safety-card card">
          <view class="safety-head">
            <view>
              <text class="map-title">景区导览攻略图</text>
              <text class="map-subtitle muted-text">详情页直接看导览图，点图可放大，完整信息放到展开区和导览页里。</text>
            </view>
            <view class="offline-status" :class="{ ready: hasOfflineMap }">{{ offlineMapStatusText }}</view>
          </view>

          <view class="offline-meta-grid">
            <view class="travel-meta-item">
              <text class="travel-meta-label">覆盖范围</text>
              <text class="travel-meta-value">{{ destinationSafetyMap.coverage }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">攻略强度</text>
              <text class="travel-meta-value">{{ destinationSafetyMap.emergencyLevel }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">本地状态</text>
              <text class="travel-meta-value">{{ offlineMapLocalStatusShort }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">离线资源</text>
              <text class="travel-meta-value">{{ offlineMapSupportShort }}</text>
            </view>
          </view>

          <view v-if="displayGuideImageUrl" class="safety-map-preview" @tap="previewGuideImage">
            <CachedImage
              :src="displayGuideImageUrl"
              image-class="cover-image guide-preview-image"
              mode="aspectFit"
              :fallback-to-remote="false"
              @error="handleGuideImageError"
              @load="handleGuideImageLoad"
            />
            <view class="safety-map-badge">点击放大查看导览图</view>
          </view>
          <view v-else class="map-fallback">
            <text class="map-fallback-title">暂无景区导览图</text>
            <text class="map-fallback-desc muted-text">请把对应景区导览图放进 `static/guide-maps`，页面会自动尝试同名不同后缀并优先读取本地离线图。</text>
          </view>

          <view v-if="guideExpanded" class="safety-legend card-lite">
            <text class="safety-item-title">导览重点</text>
            <text class="safety-item-desc muted-text">{{ destinationSafetyMap.highlights.join('；') }}</text>
          </view>

          <view v-if="guideExpanded" class="offline-meta-grid compact-grid guide-detail-grid">
            <view class="travel-meta-item">
              <text class="travel-meta-label">离线资源</text>
              <text class="travel-meta-value">{{ offlineMapSupportText }}</text>
            </view>
            <view class="travel-meta-item">
              <text class="travel-meta-label">本地状态</text>
              <text class="travel-meta-value">{{ offlineMapLocalText }}</text>
            </view>
          </view>

          <view class="safety-list compact-safety-list">
            <view v-for="item in visibleSafetyTips" :key="item.title" class="safety-item card-lite compact-safety-item">
              <text class="safety-item-title">{{ item.title }}</text>
              <text class="safety-item-desc muted-text">{{ item.desc }}</text>
            </view>
          </view>

          <view v-if="safetyTips.length > 2" class="list-toggle-inline" @tap="guideExpanded = !guideExpanded">
            {{ guideExpanded ? '收起导览提醒' : `查看更多导览提醒 ${safetyTips.length} 条` }}
          </view>

          <view class="map-actions guide-actions">
             <view class="primary-btn" @tap="openSafetyMapPage">完整导览页</view>
             <view class="primary-btn" :class="{ disabled: offlineMapBusy || !offlineMapAvailable }" @tap="handleOfflineMapDownload">
                {{ offlineMapButtonText }}
              </view>
             <view v-if="guideExpanded" class="secondary-btn" :class="{ disabled: !hasOfflineMap }" @tap="openOfflineMap">打开离线图</view>
             <view v-if="guideExpanded" class="secondary-btn" :class="{ disabled: !hasOfflineMap }" @tap="deleteOfflineMapWithConfirm">删除离线图</view>
            </view>
         </view>
      </view>

      <view class="section section-block">
        <view class="section-head-row">
          <text class="section-title">游玩建议</text>
          <view class="section-toggle-chip" @tap="tipsExpanded = !tipsExpanded">
            {{ tipsExpanded ? '收起' : '展开' }}
          </view>
        </view>
        <view class="tips-list">
          <view v-for="tip in visibleDestinationTips" :key="tip" class="tip-card card">
            <view class="tip-dot"></view>
            <text class="tip-text">{{ tip }}</text>
          </view>
        </view>
        <view v-if="destination.tips.length > 3" class="list-toggle-inline" @tap="tipsExpanded = !tipsExpanded">
          {{ tipsExpanded ? '收起建议' : `查看更多建议 ${destination.tips.length} 条` }}
        </view>
        <view class="suggestion-box">
          <text class="suggestion-title">路线建议</text>
          <text class="suggestion-text">{{ destination.suggestion }}</text>
        </view>
        <view class="ai-card card">
          <view class="ai-copy">
            <text class="suggestion-title">AI 行程助手</text>
            <text class="ai-desc muted-text">把当前景区信息直接交给 AI，快速生成半日到一日玩法，或顺手问附近怎么串联更省心。</text>
          </view>
          <view class="ai-actions">
            <view class="primary-btn" @tap="openAiAssistantForScenic">让 AI 生成当前景区玩法</view>
            <view class="secondary-btn" @tap="openAiAssistantForRoute">问 AI 怎么安排这附近</view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head-row">
          <text class="section-title">抖音直播参考</text>
          <view class="section-toggle-chip" @tap="mediaExpanded = !mediaExpanded">
            {{ mediaExpanded ? '收起' : '展开' }}
          </view>
        </view>
        <view class="live-card card">
          <view class="live-preview-compact" @tap="mediaExpanded = !mediaExpanded">
            <view>
              <text class="live-title">{{ destination.liveTitle }}</text>
              <text class="live-hint muted-text">{{ destination.liveHint }}</text>
            </view>
            <view class="section-toggle-chip compact-chip">{{ mediaExpanded ? '隐藏' : '查看' }}</view>
          </view>
          <view v-if="mediaExpanded" class="live-expanded-content">
            <view class="live-preview">
              <CachedImage :src="destination.image" image-class="cover-image" />
              <view class="live-badge">
                <view class="live-dot"></view>
                <text>DY</text>
              </view>
            </view>
            <view class="live-body">
              <text class="live-keyword">搜索词：{{ destination.liveKeyword }}</text>
              <view class="live-actions one-col">
                <view class="primary-btn" @tap="openDouyinSearch">跳转抖音搜索</view>
                <view class="secondary-btn" @tap="copyKeyword">复制搜索词</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </view>

      <view v-else class="empty-shell section">
        <text class="section-title">景区不存在</text>
        <view class="primary-btn narrow-btn" @tap="goBack">返回上一页</view>
      </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { getDestinationById, getDestinationCulture, getDestinationSafetyMap, getDestinationTravelMeta, getDestinationVisitMeta, getDouyinAppSearchUrls, getDouyinSearchUrl } from '../../common/destination-data'
import { deleteOfflineMap, downloadOfflineMap, getOfflineMapRecord } from '../../common/offline-map'
import { getCurrentLocation, getDrivingRoute, getLiveWeather, getStaticMapUrl, getWalkingRoute, resolveNavigationPoint, reverseGeocode } from '../../services/amap'
import { getRelatedGuidesForDestination } from '../../services/guides'
import { hasAmapKey } from '../../config/amap'

const routeModeOptions = [
  { label: '驾车', value: 'driving' },
  { label: '步行', value: 'walking' },
  { label: '打车', value: 'taxi' },
]

const currentId = ref('')
const destination = computed(() => getDestinationById(currentId.value))
const destinationCulture = computed(() => getDestinationCulture(currentId.value) || {
  overview: '',
  history: '',
  highlights: '',
})
const destinationTravelMeta = computed(() => getDestinationTravelMeta(currentId.value) || {
  season: '',
  stay: '',
  audience: '',
})
const destinationVisitMeta = computed(() => getDestinationVisitMeta(currentId.value) || {
  ticket: '',
  openHours: '',
})
const destinationSafetyMap = computed(() => getDestinationSafetyMap(currentId.value) || {
  title: '景区导览攻略图',
  zoom: 14,
  coverage: '主入口与核心游线',
  emergencyLevel: '中',
  terrainRisk: '',
  weatherRisk: '',
  signalRisk: '',
  safeRoute: [],
  servicePoints: [],
  emergencyContacts: [],
  highlights: [],
  note: '',
})

const locationReady = ref(false)
const locationStatusText = ref('未定位')
const routeMode = ref('driving')
const routeData = ref(null)
const liveWeatherData = ref(null)
const weatherError = ref('')
const offlineMapRecord = ref(null)
const offlineMapBusy = ref(false)
const relatedGuides = ref([])
const relatedGuidesLoading = ref(false)
const relatedGuidesError = ref('')
const introExpanded = ref(false)
const tipsExpanded = ref(false)
const mediaExpanded = ref(false)
const showAllRelatedGuides = ref(false)
const guideExpanded = ref(false)
const guideImageCandidateIndex = ref(0)
const guideImageUnavailable = ref(false)

const relatedGuidesVisible = computed(() => relatedGuidesLoading.value || relatedGuides.value.length > 0 || Boolean(relatedGuidesError.value))
const hasExtendedCulture = computed(() => Boolean(destinationCulture.value?.history || destinationCulture.value?.highlights))

const liveWeather = computed(() => {
  if (liveWeatherData.value) {
    return {
      temperature: `${liveWeatherData.value.temperature}°C`,
      condition: liveWeatherData.value.weather || '实时天气',
      humidity: `${liveWeatherData.value.humidity || '--'}%`,
      wind: `${liveWeatherData.value.winddirection || ''}${liveWeatherData.value.windpower || ''}级`,
    }
  }

  return destination.value?.weather || {
    temperature: '--',
    condition: '暂无天气',
    humidity: '--',
    wind: '--',
  }
})

const hasRealWeather = computed(() => Boolean(liveWeatherData.value))

const weatherSourceText = computed(() => {
  if (liveWeatherData.value) {
    return '高德实时天气'
  }
  return hasAmapKey() ? '天气接口失败，已降级为预设天气' : '待填写高德 Key 后自动切换为实时天气'
})

const scenicLocationText = computed(() => {
  if (!destination.value) {
    return '暂无景区信息'
  }

  const coords = destination.value.coordinates
  if (!coords) {
    return destination.value.location
  }

  return `${destination.value.location} · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
})

const routeDurationText = computed(() => formatDuration(routeData.value?.duration))

const routeDistanceText = computed(() => formatDistance(routeData.value?.distance))

const taxiCostText = computed(() => {
  if (routeMode.value !== 'taxi') {
    return ''
  }

  if (routeData.value?.taxiCost) {
    return `约 ${routeData.value.taxiCost} 元`
  }

  return hasAmapKey() ? '定位后自动估算' : '待填写高德 Key 后可估算'
})

const mapImageUrl = computed(() => {
  const coords = destination.value?.coordinates
  if (!coords) {
    return ''
  }

  const markers = [
    { longitude: coords.longitude, latitude: coords.latitude, label: '景' },
  ]

  return getStaticMapUrl({
    longitude: coords.longitude,
    latitude: coords.latitude,
    markers,
  })
})

const safetyGuidePreviewUrl = computed(() => String(destinationSafetyMap.value?.guideMapImage || '').trim())

const guidePreviewCandidates = computed(() => {
  const base = String(destinationSafetyMap.value?.guideMapImage || '').trim()
  if (!base) {
    return []
  }

  const candidates = [base]
  if (/\.jpg$/i.test(base)) {
    candidates.push(`${base}.jpg`)
    candidates.push(base.replace(/\.jpg$/i, '.png'))
    candidates.push(base.replace(/\.jpg$/i, '.jpeg'))
  } else if (/\.png$/i.test(base)) {
    candidates.push(`${base}.png`)
    candidates.push(base.replace(/\.png$/i, '.jpg'))
    candidates.push(base.replace(/\.png$/i, '.jpeg'))
  } else if (/\.jpeg$/i.test(base)) {
    candidates.push(`${base}.jpeg`)
    candidates.push(base.replace(/\.jpeg$/i, '.jpg'))
    candidates.push(base.replace(/\.jpeg$/i, '.png'))
  }

  return Array.from(new Set(candidates))
})

const displayGuideImageUrl = computed(() => {
  if (guideImageUnavailable.value) {
    return ''
  }

  if (hasOfflineMap.value && offlineMapRecord.value?.savedFilePath) {
    return toDisplayPath(offlineMapRecord.value.savedFilePath)
  }

  const previewUrl = guidePreviewCandidates.value[guideImageCandidateIndex.value] || ''
  return previewUrl ? toDisplayPath(previewUrl) : ''
})

const offlineMapVersion = computed(() => `guide-${currentId.value || 'default'}-v3`)

const offlineMapAvailable = computed(() => Boolean(safetyGuidePreviewUrl.value))

const hasOfflineMap = computed(() => Boolean(offlineMapRecord.value?.savedFilePath))

const hasOfflineMapUpdate = computed(() => {
  if (!hasOfflineMap.value || !offlineMapAvailable.value) {
    return false
  }

  return offlineMapRecord.value?.sourceUrl !== safetyGuidePreviewUrl.value || offlineMapRecord.value?.version !== offlineMapVersion.value
})

const offlineMapStatusText = computed(() => {
  if (offlineMapBusy.value) {
    return '保存中'
  }

  if (hasOfflineMapUpdate.value) {
    return '可更新'
  }

  if (hasOfflineMap.value) {
    return '已保存'
  }

  return offlineMapAvailable.value ? '未保存' : '暂未提供'
})

const offlineMapSupportText = computed(() => {
  return offlineMapAvailable.value ? '支持保存景区导览图到本地' : '当前景区暂未提供离线导览图'
})

const offlineMapLocalText = computed(() => {
  if (!hasOfflineMap.value) {
    return '本地暂无离线文件'
  }

  const timeText = formatDateTime(offlineMapRecord.value?.downloadedAt)
  return timeText ? `已保存，处理于 ${timeText}` : '已保存到本地'
})

const offlineMapSupportShort = computed(() => offlineMapAvailable.value ? '支持离线' : '暂无离线')

const offlineMapLocalStatusShort = computed(() => {
  if (hasOfflineMap.value) {
    return hasOfflineMapUpdate.value ? '已保存，可更新' : '已保存'
  }
  return offlineMapAvailable.value ? '未保存' : '暂未提供'
})

const offlineMapButtonText = computed(() => {
  if (offlineMapBusy.value) {
    return '保存中...'
  }

  if (hasOfflineMapUpdate.value) {
    return '更新离线导览图'
  }

  if (hasOfflineMap.value) {
    return '重新保存离线导览图'
  }

  return '保存离线导览图'
})

const visibleRelatedGuides = computed(() => {
  if (showAllRelatedGuides.value) {
    return relatedGuides.value
  }
  return relatedGuides.value.slice(0, 2)
})

const visibleDestinationTips = computed(() => {
  const list = Array.isArray(destination.value?.tips) ? destination.value.tips : []
  if (tipsExpanded.value) {
    return list
  }
  return list.slice(0, 3)
})

const safetyTips = computed(() => {
  if (!destination.value) {
    return []
  }

  const tips = [
    {
      title: '弱网先备份',
      desc: `出发前先保存 ${destination.value.name} 的离线导览图，弱网时直接看整张景区图，不依赖错误点位。`,
    },
    {
      title: '地形风险',
      desc: destinationSafetyMap.value.terrainRisk,
    },
    {
      title: '天气提醒',
      desc: destinationSafetyMap.value.weatherRisk,
    },
    {
      title: '信号提示',
      desc: destinationSafetyMap.value.signalRisk,
    },
  ]

  tips.push({
    title: '应急联络',
    desc: `建议优先联系 ${destinationSafetyMap.value.emergencyContacts.join('、')}。`,
  })

  return tips
})

const visibleSafetyTips = computed(() => {
  if (guideExpanded.value) {
    return safetyTips.value
  }
  return safetyTips.value.slice(0, 2)
})

onLoad(async (options) => {
  currentId.value = options?.id || ''
  guideImageCandidateIndex.value = 0
  guideImageUnavailable.value = false
  syncOfflineMapState()
  await Promise.all([
    refreshLocationAndWeather(),
    loadRelatedGuides(),
  ])
})

onShow(() => {
  guideImageCandidateIndex.value = 0
  guideImageUnavailable.value = false
  syncOfflineMapState()
  loadRelatedGuides()
})

async function loadRelatedGuides() {
  if (!destination.value) {
    relatedGuides.value = []
    relatedGuidesError.value = ''
    return
  }

  relatedGuidesLoading.value = true
  relatedGuidesError.value = ''

  try {
    relatedGuides.value = await getRelatedGuidesForDestination(destination.value, 3)
  } catch (error) {
    relatedGuides.value = []
    relatedGuidesError.value = error?.message || '暂时无法加载相关攻略，请稍后重试。'
  } finally {
    relatedGuidesLoading.value = false
  }
}

async function refreshLocationAndWeather() {
  if (!destination.value) {
    return
  }

  weatherError.value = ''
  locationStatusText.value = hasAmapKey() ? '定位中' : '待 Key'
  routeData.value = null
  liveWeatherData.value = null

  if (!hasAmapKey()) {
    locationReady.value = false
    return
  }

  const scenicCoords = destination.value.coordinates

  try {
    const scenicRegeo = scenicCoords
      ? await reverseGeocode(scenicCoords.longitude, scenicCoords.latitude)
      : null
    const scenicAdcode = scenicRegeo?.addressComponent?.adcode
    const weather = scenicAdcode ? await getLiveWeather(scenicAdcode) : null

    if (weather) {
      liveWeatherData.value = weather
    }
  } catch (error) {
    weatherError.value = '实时天气获取失败，当前显示预设天气。'
  }

  try {
    const location = await getCurrentLocation()
    const route = await loadRoute(location, scenicCoords, routeMode.value)

    if (location) {
      locationReady.value = true
      locationStatusText.value = '已定位'
    }

    if (route) {
      routeData.value = route
    }
  } catch (error) {
    locationReady.value = false
    locationStatusText.value = '定位失败'
  }
}

async function changeRouteMode(mode) {
  if (routeMode.value === mode) {
    return
  }

  routeMode.value = mode
  await refreshLocationAndWeather()
}

async function loadRoute(origin, destinationCoords, mode) {
  if (mode === 'walking') {
    return getWalkingRoute(origin, destinationCoords)
  }

  return getDrivingRoute(origin, destinationCoords)
}

function formatDuration(duration) {
  if (duration) {
    const totalMinutes = Math.round(Number(duration) / 60)
    if (totalMinutes < 60) {
      return `约 ${totalMinutes} 分钟`
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes ? `约 ${hours} 小时 ${minutes} 分钟` : `约 ${hours} 小时`
  }

  if (!hasAmapKey()) {
    return '待填写高德 Key 后可估算'
  }

  if (locationStatusText.value === '定位失败') {
    return '定位失败，暂时无法估算'
  }

  return '定位后自动估算'
}

function formatDistance(distance) {
  if (distance) {
    const distanceNum = Number(distance)
    if (distanceNum < 1000) {
      return `约 ${Math.round(distanceNum)} 米`
    }
    return `约 ${(distanceNum / 1000).toFixed(1)} 公里`
  }

  if (!hasAmapKey()) {
    return '待填写高德 Key 后可估算'
  }

  if (locationStatusText.value === '定位失败') {
    return '定位失败，暂时无法估算'
  }

  return '定位后自动估算'
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.reLaunch({ url: '/pages/home/index' })
}

function openRelatedGuide(id) {
  if (!id) {
    return
  }

  uni.navigateTo({
    url: `/pages/guide-detail/index?id=${encodeURIComponent(id)}`,
  })
}

function syncOfflineMapState() {
  if (!currentId.value) {
    offlineMapRecord.value = null
    return
  }

  offlineMapRecord.value = getOfflineMapRecord(currentId.value)
}

function toDisplayPath(filePath) {
  const raw = String(filePath || '').trim()
  if (!raw) {
    return ''
  }

  if (/^(https?:|file:|content:|blob:|data:)/i.test(raw)) {
    return raw
  }

  if (raw.startsWith('/static/') || raw.startsWith('static/')) {
    return raw.startsWith('/') ? raw : `/${raw}`
  }

  if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
    const absolutePath = plus.io.convertLocalFileSystemURL(raw)
    if (absolutePath) {
      return absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`
    }
  }

  return raw
}

function previewGuideImage() {
  if (!displayGuideImageUrl.value) {
    return
  }

  uni.previewImage({
    current: displayGuideImageUrl.value,
    urls: [displayGuideImageUrl.value],
  })
}

function handleGuideImageError() {
  if (hasOfflineMap.value && offlineMapRecord.value?.savedFilePath) {
    guideImageUnavailable.value = true
    return
  }

  if (guidePreviewCandidates.value.length && guideImageCandidateIndex.value < guidePreviewCandidates.value.length - 1) {
    guideImageCandidateIndex.value += 1
    return
  }

  guideImageUnavailable.value = true
}

function handleGuideImageLoad() {
  guideImageUnavailable.value = false
}

async function handleOfflineMapDownload() {
  if (offlineMapBusy.value || !destination.value || !offlineMapAvailable.value) {
    return
  }

  offlineMapBusy.value = true

  try {
    await downloadOfflineMap({
      destinationId: currentId.value,
      scenicName: destination.value.name,
      mapUrl: safetyGuidePreviewUrl.value,
      version: offlineMapVersion.value,
      metadata: destinationSafetyMap.value,
    })

    syncOfflineMapState()

    uni.showToast({
      title: '离线导览图已保存',
      icon: 'none',
    })
  } catch (error) {
    uni.showModal({
      title: '保存失败',
      content: error.message || '离线导览图保存失败，请稍后再试。',
      showCancel: false,
    })
  } finally {
    offlineMapBusy.value = false
  }
}

function openOfflineMap() {
  if (!hasOfflineMap.value) {
    return
  }

  uni.navigateTo({
    url: `/pages/safety-map/index?id=${encodeURIComponent(currentId.value)}&offline=1`,
  })
}

function openSafetyMapPage() {
  if (!destination.value) {
    return
  }

  uni.navigateTo({
    url: `/pages/safety-map/index?id=${encodeURIComponent(currentId.value)}`,
  })
}

function deleteOfflineMapWithConfirm() {
  if (!hasOfflineMap.value) {
    return
  }

  uni.showModal({
    title: '删除离线导览图',
    content: '确认删除当前景区已保存的离线导览图吗？删除后需要重新保存。',
    success: async ({ confirm }) => {
      if (!confirm) {
        return
      }

      await deleteOfflineMap(currentId.value)
      syncOfflineMapState()
      uni.showToast({
        title: '已删除离线导览图',
        icon: 'none',
      })
    },
  })
}

function openDouyinSearch() {
  if (!destination.value) {
    return
  }

  const keyword = destination.value.liveKeyword
  const url = getDouyinSearchUrl(destination.value.liveKeyword)
  const appUrls = getDouyinAppSearchUrls(keyword)

  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    const [preferredAppUrl] = appUrls
    if (preferredAppUrl) {
      plus.runtime.openURL(preferredAppUrl, () => {
        plus.runtime.openURL(url, () => {
          fallbackToCopyKeyword(keyword)
        })
      })
      return
    }

    plus.runtime.openURL(url, () => {
      fallbackToCopyKeyword(keyword)
    })
    return
  }

  // H5/部分端
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank')
    return
  }

  fallbackToCopyKeyword(keyword)
}

function fallbackToCopyKeyword(keyword) {
  uni.setClipboardData({
    data: keyword,
    success: () => {
      uni.showModal({
        title: '已准备跳转',
        content: '已优先尝试唤起抖音 App 搜索；如果当前设备未成功打开抖音，已帮你复制搜索词，可手动粘贴搜索。',
        showCancel: false,
      })
    },
  })
}

function copyKeyword() {
  if (!destination.value) {
    return
  }
  uni.setClipboardData({
    data: destination.value.liveKeyword,
    success: () => {
      uni.showToast({ title: '已复制搜索词', icon: 'none' })
    },
  })
}

async function openScenicLocation() {
  const coords = destination.value?.coordinates
  if (!coords) {
    return
  }

  const navigationName = destination.value.navigationName || destination.value.name
  const navigationAddress = destination.value.navigationAddress || destination.value.location
  let targetPoint = {
    longitude: Number(coords.longitude),
    latitude: Number(coords.latitude),
    name: navigationName,
    address: navigationAddress,
  }

  try {
    const resolvedPoint = await resolveNavigationPoint({
      name: navigationName,
      address: navigationAddress,
      region: destination.value.location,
      longitude: coords.longitude,
      latitude: coords.latitude,
    })

    if (resolvedPoint) {
      targetPoint = {
        longitude: resolvedPoint.longitude,
        latitude: resolvedPoint.latitude,
        name: resolvedPoint.name || navigationName,
        address: resolvedPoint.address || navigationAddress,
      }
    }
  } catch (error) {
    console.warn('[destination-detail] resolve navigation point failed', error)
  }

  const amapUrl = `amapuri://navi?sourceApplication=${encodeURIComponent('丝路疆寻')}&lat=${targetPoint.latitude}&lon=${targetPoint.longitude}&dev=0&style=2&poiname=${encodeURIComponent(targetPoint.name)}`

  if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
    plus.runtime.openURL(amapUrl, () => {
      uni.openLocation({
        longitude: targetPoint.longitude,
        latitude: targetPoint.latitude,
        name: targetPoint.name,
        address: targetPoint.address,
      })
    })
    return
  }

  uni.openLocation({
    longitude: targetPoint.longitude,
    latitude: targetPoint.latitude,
    name: targetPoint.name,
    address: targetPoint.address,
  })
}

function openAiAssistantForScenic() {
  if (!destination.value) {
    return
  }

  openAiAssistant({
    prompt: `我正在看${destination.value.name}，请结合这个景区的特点，给我一份半天到一天的游玩建议。`,
    autoAsk: true,
  })
}

function openAiAssistantForRoute() {
  if (!destination.value) {
    return
  }

  openAiAssistant({
    prompt: `如果我准备去${destination.value.name}，周边还能怎么安排更顺路？请给我一个适合当天或前后半天串联的建议。`,
    autoAsk: false,
  })
}

function openAiAssistant({ prompt, autoAsk }) {
  if (!destination.value) {
    return
  }

  const params = buildAiAssistantParams(destination.value, prompt, autoAsk)
  uni.navigateTo({ url: `/pages/ai-assistant/index?${params}` })
}

function buildAiAssistantParams(item, prompt, autoAsk) {
  const context = [
    `景区名称：${item.name}`,
    `所在地区：${item.location}`,
    `景区分类：${item.category}`,
    `景区介绍：${item.description}`,
    `游玩提示：${item.tips.join('；')}`,
    `路线建议：${item.suggestion}`,
  ].join('\n')

  return [
    ['title', item.name],
    ['desc', item.description],
    ['source', '景区详情'],
    ['prompt', prompt],
    ['context', context],
    ['autoAsk', autoAsk ? '1' : '0'],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.hero-card {
  position: relative;
  height: 640rpx;
  overflow: hidden;
}

.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.6));
}

.detail-topbar {
  position: absolute;
  top: 36rpx;
  left: 24rpx;
  right: 24rpx;
  z-index: 2;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  backdrop-filter: blur(8px);
}

.hero-info {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 40rpx;
  z-index: 2;
  color: #ffffff;
}

.category-chip {
  display: inline-flex;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  margin-bottom: 18rpx;
}

.hero-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
}

.hero-location,
.hero-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.7;
}

.section-block {
  margin-top: 36rpx;
}

.section-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.section-toggle-chip {
  flex-shrink: 0;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.16);
  color: $theme-color;
  font-size: 22rpx;
  font-weight: 600;
}

.guide-chip,
.compact-chip {
  background: rgba(196, 69, 54, 0.12);
}

.story-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.travel-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.visit-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.travel-meta-item {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
  border: 2rpx solid rgba(232, 168, 124, 0.24);
}

.travel-meta-item.full-width {
  grid-column: 1 / -1;
}

.travel-meta-label {
  display: block;
  font-size: 22rpx;
  color: $theme-muted;
}

.travel-meta-value {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: $theme-text;
  font-weight: 600;
}

.story-row {
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid rgba(196, 69, 54, 0.08);
}

.story-row.last-row {
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: 0;
}

.story-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $theme-color;
}

.story-text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: $theme-text;
}

@media screen and (max-width: 720rpx) {
  .travel-meta-grid {
    grid-template-columns: 1fr;
  }

  .visit-meta-grid {
    grid-template-columns: 1fr;
  }

  .travel-meta-item.full-width {
    grid-column: auto;
  }
}

.map-card,
.safety-card,
.related-guides-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.related-guides-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22rpx;
}

.related-guides-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.list-toggle-inline {
  margin-top: 6rpx;
  text-align: center;
  font-size: 22rpx;
  color: $theme-color;
}

.related-guide-item {
  display: flex;
  gap: 18rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.1);
}

.related-guide-cover {
  width: 180rpx;
  height: 180rpx;
  border-radius: 22rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(232, 168, 124, 0.16);
}

.related-guide-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $theme-color;
  font-size: 28rpx;
  font-weight: 600;
}

.related-guide-body {
  flex: 1;
  min-width: 0;
}

.related-guide-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 28rpx;
  line-height: 1.5;
  font-weight: 600;
  color: $theme-text;
}

.related-guide-meta,
.related-guide-summary,
.related-guide-stat {
  display: block;
  font-size: 22rpx;
  line-height: 1.7;
}

.related-guide-meta {
  margin-top: 10rpx;
}

.related-guide-summary {
  margin-top: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-guide-foot {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}

.map-head,
.weather-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22rpx;
}

.map-title,
.suggestion-title,
.live-title,
.weather-condition {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.map-subtitle,
.weather-note,
.tip-text,
.suggestion-text,
.live-hint,
.live-keyword,
.meta-value,
.meta-label,
.weather-label,
.weather-value {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
}

.map-status {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(139, 111, 71, 0.12);
  color: $theme-muted;
  flex-shrink: 0;
}

.map-status.ready {
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
}

.travel-overview-grid {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.travel-overview-card {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.1);
}

.travel-overview-label {
  display: block;
  font-size: 22rpx;
  color: $theme-muted;
}

.travel-overview-value {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  line-height: 1.2;
  font-weight: 700;
  color: $theme-text;
}

.travel-overview-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
}

.weather-emphasis {
  color: $theme-color;
}

.offline-status {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(139, 111, 71, 0.12);
  color: $theme-muted;
  flex-shrink: 0;
}

.offline-status.ready {
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
}

.location-meta {
  margin-top: 22rpx;
}

.route-mode-group {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
  margin-top: 14rpx;
}

.route-mode-chip {
  min-width: 120rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.12);
  color: $theme-text;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.route-mode-chip.active {
  background: $theme-color;
  color: #ffffff;
}

.scenic-meta {
  margin-top: 12rpx;
}

.route-summary {
  margin-top: 18rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.card-lite {
  border: 2rpx solid rgba(232, 168, 124, 0.2);
}

.route-summary-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.route-summary-wide {
  grid-column: 1 / -1;
}

.route-highlight {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $theme-color;
}

.meta-label {
  color: $theme-muted;
}

.map-preview {
  position: relative;
  height: 320rpx;
  margin-top: 22rpx;
  overflow: hidden;
  border-radius: 28rpx;
}

.map-fallback {
  margin-top: 22rpx;
  padding: 32rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.12);
  border: 2rpx dashed rgba(196, 69, 54, 0.24);
}

.map-fallback-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.map-fallback-desc {
  margin-top: 10rpx;
}

.map-actions,
.live-actions {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.travel-weather-note {
  margin-top: 18rpx;
}

.safety-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22rpx;
}

.offline-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-top: 22rpx;
}

.guide-detail-grid {
  margin-top: 16rpx;
}

.safety-list {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.compact-safety-list {
  gap: 12rpx;
}

.safety-map-preview {
  margin-top: 22rpx;
  position: relative;
  height: 320rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: rgba(232, 168, 124, 0.08);
}

.compact-grid {
  margin-top: 16rpx;
}

.guide-preview-image {
  background: #f8f3ee;
}

.safety-map-badge {
  position: absolute;
  left: 18rpx;
  bottom: 18rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.52);
  color: #ffffff;
  font-size: 22rpx;
}

.safety-legend {
  margin-top: 22rpx;
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
}

.safety-item {
  padding: 22rpx;
  border-radius: 24rpx;
  background: rgba(232, 168, 124, 0.12);
}

.compact-safety-item {
  padding: 18rpx 20rpx;
}

.safety-item-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $theme-text;
}

.safety-item-desc {
  margin-top: 10rpx;
}

.guide-actions {
  grid-template-columns: repeat(2, 1fr);
}

.live-actions.one-col {
  grid-template-columns: 1fr;
}

.weather-note {
  margin-top: 18rpx;
  color: $theme-muted;
}

.tips-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.tip-card {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 24rpx;
}

.tip-dot {
  width: 14rpx;
  height: 14rpx;
  margin-top: 10rpx;
  border-radius: 50%;
  background: $theme-color;
  flex-shrink: 0;
}

.suggestion-box {
  margin-top: 22rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(232, 168, 124, 0.16);
  border: 2rpx solid rgba(232, 168, 124, 0.34);
}

.ai-card {
  margin-top: 22rpx;
  padding: 28rpx;
}

.ai-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.ai-actions {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

.live-card {
  margin-top: 24rpx;
  overflow: hidden;
}

.live-preview-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 26rpx;
}

.live-expanded-content {
  border-top: 2rpx solid rgba(196, 69, 54, 0.08);
}

.live-preview {
  position: relative;
  height: 300rpx;
}

.live-badge {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #ffffff;
}

.live-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ff584d;
}

.live-body {
  padding: 26rpx;
}

.live-keyword {
  margin-top: 10rpx;
  color: $theme-color;
}

.primary-btn,
.secondary-btn,
.narrow-btn {
  height: 84rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.primary-btn {
  background: $theme-color;
  color: #ffffff;
}

.secondary-btn {
  background: #ffffff;
  border: 2rpx solid rgba(196, 69, 54, 0.16);
  color: $theme-text;
}

.primary-btn.disabled,
.secondary-btn.disabled {
  opacity: 0.5;
}

.empty-shell {
  padding-top: 120rpx;
}

.narrow-btn {
  margin-top: 28rpx;
}

@media screen and (max-width: 720rpx) {
  .travel-overview-grid,
  .offline-meta-grid {
    grid-template-columns: 1fr;
  }

  .section-head-row {
    align-items: flex-start;
  }
}
</style>
