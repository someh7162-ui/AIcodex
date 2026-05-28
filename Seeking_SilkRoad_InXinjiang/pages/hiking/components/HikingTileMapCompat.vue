<template>
  <view class="tile-map">
    <view class="tile-grid" :style="gridStyle">
      <block v-for="tile in tiles" :key="tile.key">
        <image class="tile-image" :src="tile.baseUrl" mode="scaleToFill" :style="tile.style" @error="handleTileError"></image>
        <image
          v-if="tile.annotationUrl"
          class="tile-image tile-annotation"
          :src="tile.annotationUrl"
          mode="scaleToFill"
          :style="tile.style"
          @error="handleTileError"
        ></image>
      </block>

      <canvas
        :canvas-id="canvasId"
        class="track-canvas"
        :style="canvasStyle"
        :width="GRID_SIZE"
        :height="GRID_SIZE"
      ></canvas>

      <view
        v-for="marker in markerDots"
        :key="marker.key"
        class="marker-dot"
        :style="marker.style"
      >
        <image v-if="marker.avatarUrl" class="marker-avatar" :src="marker.avatarUrl" mode="aspectFill"></image>
        <text v-else class="marker-initial">{{ marker.avatarInitial }}</text>
        <view class="marker-core"></view>
        <view class="marker-badge">{{ marker.statusText }}</view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'
import { resolveOfflineTileSource } from '../../../common/offline-tile-packs'
import { simplifyTrackPoints } from '../../../common/hiking-track-display'
import { getTiandituLayerConfig } from '../../../services/tianditu'

const TILE_SIZE = 256
const TILE_RADIUS = 2
const GRID_SIZE = (TILE_RADIUS * 2 + 1) * TILE_SIZE

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
    default: 'normal',
  },
  offlinePackId: {
    type: String,
    default: '',
  },
  showCenterMarker: {
    type: Boolean,
    default: true,
  },
})

const tileErrorCount = ref(0)
const instance = getCurrentInstance()
const canvasId = `hiking-tile-track-canvas-${instance?.uid || Date.now()}`

const mapMode = computed(() => {
  if (props.mapModeKey === 'satellite') {
    return 'imagery'
  }
  if (props.mapModeKey === 'terrain') {
    return 'terrain'
  }
  return 'vector'
})

const tileConfig = computed(() => getTiandituLayerConfig(mapMode.value))
const zoomLevel = computed(() => {
  const raw = Math.round(Number(props.mapScale || 15))
  return Math.max(3, Math.min(18, raw))
})

const projectedCenter = computed(() => projectToTile(props.mapCenter?.longitude, props.mapCenter?.latitude, zoomLevel.value))
const gridStyle = computed(() => {
  if (!projectedCenter.value) {
    return {}
  }

  const translateX = -((TILE_RADIUS + projectedCenter.value.fracX) * TILE_SIZE)
  const translateY = -((TILE_RADIUS + projectedCenter.value.fracY) * TILE_SIZE)
  return {
    width: `${GRID_SIZE}px`,
    height: `${GRID_SIZE}px`,
    transform: `translate(${translateX}px, ${translateY}px)`,
  }
})

const tiles = computed(() => {
  if (!projectedCenter.value || !tileConfig.value.ready || !tileConfig.value.tileUrl) {
    return []
  }

  const total = 2 ** zoomLevel.value
  const list = []
  for (let row = -TILE_RADIUS; row <= TILE_RADIUS; row += 1) {
    for (let col = -TILE_RADIUS; col <= TILE_RADIUS; col += 1) {
      const tileX = modulo(projectedCenter.value.tileX + col, total)
      const tileY = clamp(projectedCenter.value.tileY + row, 0, total - 1)
      const left = (col + TILE_RADIUS) * TILE_SIZE
      const top = (row + TILE_RADIUS) * TILE_SIZE
      list.push({
        key: `${zoomLevel.value}-${tileX}-${tileY}`,
        baseUrl: resolveOfflineTileSource({
          packId: props.offlinePackId,
          mode: mapMode.value,
          layerType: 'base',
          x: tileX,
          y: tileY,
          z: zoomLevel.value,
          fallbackUrl: fillTileUrl(tileConfig.value.tileUrl, tileX, tileY, zoomLevel.value),
        }),
        annotationUrl: tileConfig.value.annotationUrl
          ? resolveOfflineTileSource({
              packId: props.offlinePackId,
              mode: mapMode.value,
              layerType: 'annotation',
              x: tileX,
              y: tileY,
              z: zoomLevel.value,
              fallbackUrl: fillTileUrl(tileConfig.value.annotationUrl, tileX, tileY, zoomLevel.value),
            })
          : '',
        style: `left:${left}px;top:${top}px;width:${TILE_SIZE}px;height:${TILE_SIZE}px;`,
      })
    }
  }
  return list
})

const markerDots = computed(() => {
  const source = Array.isArray(props.mapMarkers) && props.mapMarkers.length
    ? props.mapMarkers
    : (props.showCenterMarker && props.mapCenter ? [props.mapCenter] : [])

  const list = source
    .map((item, index) => {
      const point = projectPoint(item?.longitude, item?.latitude)
      if (!point) {
        return null
      }
      return {
        key: `marker-${index}`,
        style: `left:${point.x - 26}px;top:${point.y - 26}px;`,
        avatarUrl: String(item?.avatarUrl || ''),
        avatarInitial: String(item?.avatarInitial || '游').slice(0, 1) || '游',
        statusText: String(item?.statusText || item?.callout?.content || '当前位置'),
      }
    })
    .filter(Boolean)

  return list.slice(0, 3)
})

const displayTrackPoints = computed(() => {
  const line = Array.isArray(props.mapPolyline) ? props.mapPolyline[0] : null
  const points = Array.isArray(line?.points) ? line.points : []
  return simplifyTrackPoints(points, zoomLevel.value)
})
const canvasStyle = computed(() => `left:0;top:0;width:${GRID_SIZE}px;height:${GRID_SIZE}px;`)

onMounted(() => {
  console.log('[tile-map] mounted', {
    canvasId,
    scale: zoomLevel.value,
    hasCenter: Boolean(props.mapCenter),
    markerCount: Array.isArray(props.mapMarkers) ? props.mapMarkers.length : 0,
    polylinePoints: Array.isArray(props.mapPolyline?.[0]?.points) ? props.mapPolyline[0].points.length : 0,
  })
  scheduleCanvasDraw()
})

watch([projectedCenter, displayTrackPoints, zoomLevel], () => {
  console.log('[tile-map] watch redraw', {
    canvasId,
    scale: zoomLevel.value,
    displayPoints: displayTrackPoints.value.length,
    hasProjectedCenter: Boolean(projectedCenter.value),
  })
  scheduleCanvasDraw()
}, { deep: true })

async function scheduleCanvasDraw() {
  console.log('[tile-map] schedule draw', { canvasId })
  await nextTick()
  drawTrackCanvas()
}

function drawTrackCanvas() {
  console.log('[tile-map] draw start', { canvasId })
  const context = uni.createCanvasContext(canvasId, instance?.proxy)
  context.clearRect(0, 0, GRID_SIZE, GRID_SIZE)

  const line = Array.isArray(props.mapPolyline) ? props.mapPolyline[0] : null
  const color = line?.color || '#ff7a00'
  const borderColor = line?.borderColor || '#c14f00'
  const width = Math.max(4, Number(line?.width || 5))
  const points = displayTrackPoints.value
    .map((point) => projectPoint(point?.longitude, point?.latitude))
    .filter(Boolean)

  if (points.length >= 2) {
    context.beginPath()
    context.setLineJoin('round')
    context.setLineCap('round')
    context.setStrokeStyle(borderColor)
    context.setLineWidth(width + 2)
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y)
    }
    context.stroke()

    context.beginPath()
    context.setLineJoin('round')
    context.setLineCap('round')
    context.setStrokeStyle(color)
    context.setLineWidth(width)
    context.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y)
    }
    context.stroke()
  }

  context.draw(false, () => {
    console.log('[tile-map] draw complete', { canvasId, pointCount: points.length })
  })
}

function projectPoint(longitude, latitude) {
  if (!projectedCenter.value) {
    return null
  }

  const projected = projectToTile(longitude, latitude, zoomLevel.value)
  if (!projected) {
    return null
  }

  const originX = projectedCenter.value.tileX - TILE_RADIUS
  const originY = projectedCenter.value.tileY - TILE_RADIUS
  return {
    x: (projected.worldX - originX) * TILE_SIZE,
    y: (projected.worldY - originY) * TILE_SIZE,
  }
}

function projectToTile(longitude, latitude, zoom) {
  const lng = Number(longitude)
  const lat = Number(latitude)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  const boundedLat = clamp(lat, -85.05112878, 85.05112878)
  const total = 2 ** zoom
  const worldX = ((lng + 180) / 360) * total
  const rad = (boundedLat * Math.PI) / 180
  const worldY = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * total
  const tileX = Math.floor(worldX)
  const tileY = Math.floor(worldY)
  return {
    worldX,
    worldY,
    tileX,
    tileY,
    fracX: worldX - tileX,
    fracY: worldY - tileY,
  }
}

function fillTileUrl(template, x, y, z) {
  return String(template || '')
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function modulo(value, max) {
  return ((value % max) + max) % max
}

function handleTileError() {
  tileErrorCount.value += 1
}
</script>

<style scoped lang="scss">
.tile-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #050607;
}

.tile-grid {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: top left;
}

.tile-image,
.track-canvas,
.marker-dot {
  position: absolute;
}

.tile-image {
  display: block;
}

.tile-annotation {
  pointer-events: none;
}

.track-canvas {
  pointer-events: none;
}

.marker-dot {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d97706, #f59e0b);
  border: 3px solid rgba(255, 255, 255, 0.94);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  overflow: visible;
}

.marker-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.marker-initial {
  font-size: 22px;
  font-weight: 700;
  color: #fffdf8;
}

.marker-core {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff7a00;
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border: 3px solid rgba(255, 255, 255, 0.94);
  box-shadow: 0 0 0 8px rgba(255, 122, 0, 0.16);
}

.marker-badge {
  position: absolute;
  left: 50%;
  top: calc(100% + 14px);
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.9);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
}

</style>
