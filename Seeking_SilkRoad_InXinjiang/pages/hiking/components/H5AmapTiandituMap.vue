<template>
  <view ref="containerRef" class="h5-map-host"></view>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createAmapPoint, loadAmapWebSdk } from '../../../services/amap-web'

const props = defineProps({
  mapCenter: {
    type: Object,
    default: null,
  },
  mapScale: {
    type: Number,
    default: 15,
  },
  mapPolyline: {
    type: Array,
    default: () => [],
  },
  mapMarkers: {
    type: Array,
    default: () => [],
  },
  mapModeKey: {
    type: String,
    default: 'terrain',
  },
})

const containerRef = ref(null)

let AMapRef = null
let map = null
let baseLayers = []
let markerOverlays = []
let polylineOverlays = []

function clearOverlays(list = []) {
  list.forEach((item) => {
    if (item && typeof item.setMap === 'function') {
      item.setMap(null)
    }
  })
  list.length = 0
}

function syncCenter() {
  if (!map || !props.mapCenter || !AMapRef) {
    return
  }

  const point = createAmapPoint(props.mapCenter.longitude, props.mapCenter.latitude, AMapRef)
  if (point) {
    map.setCenter(point)
  }
}

function syncZoom() {
  if (map && Number.isFinite(Number(props.mapScale))) {
    map.setZoom(Number(props.mapScale))
  }
}

function syncMarkers() {
  if (!map || !AMapRef) {
    return
  }

  clearOverlays(markerOverlays)
  props.mapMarkers.forEach((item) => {
    const point = createAmapPoint(item.longitude, item.latitude, AMapRef)
    if (!point) {
      return
    }

    const marker = new AMapRef.Marker({
      position: point,
      anchor: 'top-left',
      content: createMarkerContent(item),
      offset: new AMapRef.Pixel(-26, -53),
    })
    marker.setMap(map)
    markerOverlays.push(marker)
  })
}

function createMarkerContent(marker) {
  const avatarUrl = escapeHtml(String(marker?.avatarUrl || ''))
  const avatarInitial = escapeHtml(String(marker?.avatarInitial || '游').slice(0, 1) || '游')
  const statusText = escapeHtml(String(marker?.statusText || marker?.callout?.content || '当前位置'))
  const avatarNode = avatarUrl
    ? `<img class="avatar-photo" src="${avatarUrl}" alt="avatar" />`
    : `<span class="avatar-fallback">${avatarInitial}</span>`

  return `<div class="hiking-avatar-marker"><div class="avatar-shell">${avatarNode}</div><div class="marker-pulse"></div><div class="marker-badge">${statusText}</div></div>`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function syncPolyline() {
  if (!map || !AMapRef) {
    return
  }

  clearOverlays(polylineOverlays)
  props.mapPolyline.forEach((line) => {
    const path = Array.isArray(line.points)
      ? line.points
        .map((item) => createAmapPoint(item.longitude, item.latitude, AMapRef))
        .filter(Boolean)
      : []

    if (!path.length) {
      return
    }

    const polyline = new AMapRef.Polyline({
      path,
      strokeColor: line.color || '#FF7A00',
      strokeWeight: Number(line.width || 5),
      borderWeight: Number(line.borderWidth || 1),
      outlineColor: line.borderColor || '#C14F00',
      lineJoin: 'round',
      lineCap: 'round',
    })
    polyline.setMap(map)
    polylineOverlays.push(polyline)
  })
}

function buildBaseLayers() {
  if (!AMapRef) {
    return []
  }

  if (props.mapModeKey === 'satellite') {
    return [
      new AMapRef.TileLayer.Satellite(),
      new AMapRef.TileLayer.RoadNet(),
    ]
  }

  return [new AMapRef.TileLayer()]
}

function syncBaseLayers() {
  if (!map || !AMapRef) {
    return
  }

  if (baseLayers.length) {
    baseLayers.forEach((layer) => {
      if (layer && typeof layer.setMap === 'function') {
        layer.setMap(null)
      }
    })
    baseLayers = []
  }

  baseLayers = buildBaseLayers()
  if (typeof map.setLayers === 'function') {
    map.setLayers(baseLayers)
    return
  }
  baseLayers.forEach((layer) => layer.setMap(map))
}

async function initMap() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  await nextTick()
  if (!containerRef.value || map) {
    return
  }

  AMapRef = await loadAmapWebSdk()
  if (!AMapRef) {
    return
  }

  const point = props.mapCenter
    ? createAmapPoint(props.mapCenter.longitude, props.mapCenter.latitude, AMapRef)
    : null

  map = new AMapRef.Map(containerRef.value, {
    zoom: Number(props.mapScale || 15),
    center: point || undefined,
    viewMode: '2D',
    mapStyle: 'amap://styles/normal',
    resizeEnable: true,
  })

  syncBaseLayers()
  syncMarkers()
  syncPolyline()
}

onMounted(() => {
  initMap().catch(() => {})
})

watch(() => props.mapCenter, () => {
  syncCenter()
}, { deep: true })

watch(() => props.mapScale, () => {
  syncZoom()
})

watch(() => props.mapModeKey, () => {
  syncBaseLayers()
})

watch(() => props.mapMarkers, () => {
  syncMarkers()
}, { deep: true })

watch(() => props.mapPolyline, () => {
  syncPolyline()
}, { deep: true })

onBeforeUnmount(() => {
  clearOverlays(markerOverlays)
  clearOverlays(polylineOverlays)
  if (map) {
    if (baseLayers.length) {
      baseLayers.forEach((layer) => {
        if (layer && typeof layer.setMap === 'function') {
          layer.setMap(null)
        }
      })
      baseLayers = []
    }
    map.destroy()
    map = null
  }
})
</script>

<style scoped lang="scss">
.h5-map-host {
  width: 100%;
  height: 100%;
}

:deep(.hiking-avatar-marker) {
  position: relative;
  width: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.hiking-avatar-marker .avatar-shell) {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  border: 3px solid rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.hiking-avatar-marker .avatar-photo) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:deep(.hiking-avatar-marker .avatar-fallback) {
  font-size: 20px;
  font-weight: 700;
  color: #fffdf8;
}

:deep(.hiking-avatar-marker .marker-pulse) {
  width: 14px;
  height: 14px;
  margin-top: -6px;
  border-radius: 50%;
  background: #ff7a00;
  border: 3px solid rgba(255, 255, 255, 0.94);
  box-shadow: 0 0 0 8px rgba(255, 122, 0, 0.18);
}

:deep(.hiking-avatar-marker .marker-badge) {
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.9);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
}
</style>
