<template>
  <view class="cached-image" :class="containerClass">
    <view v-if="loading" class="image-placeholder">
      <view class="image-shimmer"></view>
    </view>
    <image
      v-show="!loading"
      :class="imageClass"
      :src="currentSrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      @load="handleLoad"
      @error="handleError"
    ></image>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { downloadRemoteFile } from '../common/app-http'
import { API_ORIGIN } from '../config/api'

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  mode: {
    type: String,
    default: 'aspectFill',
  },
  lazyLoad: {
    type: Boolean,
    default: true,
  },
  containerClass: {
    type: String,
    default: '',
  },
  imageClass: {
    type: String,
    default: '',
  },
  fallbackToRemote: {
    type: Boolean,
    default: true,
  },
})

const loading = ref(true)
const currentSrc = ref('')

function canUseRemoteFallback() {
  const platform = uni.getSystemInfoSync().platform
  return props.fallbackToRemote && (platform === 'devtools' || platform === 'web')
}

function canUseDirectRemote(url) {
  const raw = String(url || '')
  return canUseRemoteFallback() || (props.fallbackToRemote && raw.startsWith(API_ORIGIN))
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

function storageKey(url) {
  return `cached-image:${encodeURIComponent(url)}`
}

async function resolveImage(url) {
  if (!url) {
    currentSrc.value = ''
    loading.value = false
    return
  }

  loading.value = true

  // 本地路径直接使用，不走下载缓存
  if (!/^https?:\/\//.test(url)) {
    currentSrc.value = toDisplayPath(url)
    loading.value = false
    return
  }

  const key = storageKey(url)
  const cachedPath = uni.getStorageSync(key)

  if (cachedPath) {
    currentSrc.value = toDisplayPath(cachedPath)
    loading.value = false
    return
  }

  if (canUseDirectRemote(url)) {
    currentSrc.value = url
    loading.value = false
    return
  }

  currentSrc.value = ''

  try {
    const downloadRes = await downloadRemoteFile(url)
    if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
      loading.value = false
      return
    }

    if (typeof plus !== 'undefined' && downloadRes.tempFilePath.startsWith('_doc/')) {
      uni.setStorageSync(key, downloadRes.tempFilePath)
      currentSrc.value = toDisplayPath(downloadRes.tempFilePath)
      return
    }

    const saveRes = await uni.saveFile({ tempFilePath: downloadRes.tempFilePath })
    if (saveRes.savedFilePath) {
      uni.setStorageSync(key, saveRes.savedFilePath)
      currentSrc.value = toDisplayPath(saveRes.savedFilePath)
      return
    }

  } catch (error) {
    if (canUseDirectRemote(url)) {
      currentSrc.value = url
    }
  } finally {
    loading.value = false
  }
}

function handleLoad() {
  loading.value = false
}

function handleError() {
  loading.value = false
  if (canUseDirectRemote(props.src)) {
    currentSrc.value = props.src
    return
  }

  currentSrc.value = ''
}

watch(
  () => props.src,
  (value) => {
    resolveImage(value)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.cached-image {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: rgba(212, 165, 116, 0.12);
}

.cached-image image {
  width: 100%;
  height: 100%;
  display: block;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(232, 168, 124, 0.22), rgba(250, 248, 245, 0.88));
}

.image-shimmer {
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0) 100%);
  animation: shimmer 1.3s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
