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
      anchor: 'center',
      label: item.callout?.content
        ? {
            content: item.callout.content,
            direction: 'top',
          }
        : undefined,
    })
    marker.setMap(map)
    markerOverlays.push(marker)
  })
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
</style>
