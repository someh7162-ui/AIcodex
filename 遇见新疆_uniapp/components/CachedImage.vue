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
})

const loading = ref(true)
const currentSrc = ref('')

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

  const key = storageKey(url)
  const cachedPath = uni.getStorageSync(key)

  if (cachedPath) {
    currentSrc.value = cachedPath
    loading.value = false
    return
  }

  currentSrc.value = url

  const platform = uni.getSystemInfoSync().platform
  if (platform === 'devtools' || platform === 'web') {
    loading.value = false
    return
  }

  try {
    const downloadRes = await uni.downloadFile({ url })
    if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
      loading.value = false
      return
    }

    const saveRes = await uni.saveFile({ tempFilePath: downloadRes.tempFilePath })
    if (saveRes.savedFilePath) {
      uni.setStorageSync(key, saveRes.savedFilePath)
      currentSrc.value = saveRes.savedFilePath
    }
  } catch (error) {
    currentSrc.value = url
  } finally {
    loading.value = false
  }
}

function handleLoad() {
  loading.value = false
}

function handleError() {
  loading.value = false
  currentSrc.value = props.src
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
