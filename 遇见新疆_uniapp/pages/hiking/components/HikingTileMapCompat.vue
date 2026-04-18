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

      <view
        v-for="segment in trackSegments"
        :key="segment.key"
        class="track-segment"
        :style="segment.style"
      ></view>

      <view
        v-for="marker in markerDots"
        :key="marker.key"
        class="marker-dot"
        :style="marker.style"
      >
        <view class="marker-core"></view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
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
})

const tileErrorCount = ref(0)

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
        baseUrl: fillTileUrl(tileConfig.value.tileUrl, tileX, tileY, zoomLevel.value),
        annotationUrl: tileConfig.value.annotationUrl
          ? fillTileUrl(tileConfig.value.annotationUrl, tileX, tileY, zoomLevel.value)
          : '',
        style: `left:${left}px;top:${top}px;width:${TILE_SIZE}px;height:${TILE_SIZE}px;`,
      })
    }
  }
  return list
})

const markerDots = computed(() => {
  const list = (Array.isArray(props.mapMarkers) && props.mapMarkers.length ? props.mapMarkers : [props.mapCenter])
    .map((item, index) => {
      const point = projectPoint(item?.longitude, item?.latitude)
      if (!point) {
        return null
      }
      return {
        key: `marker-${index}`,
        style: `left:${point.x - 18}px;top:${point.y - 18}px;`,
      }
    })
    .filter(Boolean)

  return list.slice(0, 3)
})

const trackSegments = computed(() => {
  const line = Array.isArray(props.mapPolyline) ? props.mapPolyline[0] : null
  const points = Array.isArray(line?.points) ? line.points : []
  const color = line?.color || '#ff7a00'
  const width = Math.max(4, Number(line?.width || 5))
  const segments = []

  for (let index = 1; index < points.length; index += 1) {
    const start = projectPoint(points[index - 1]?.longitude, points[index - 1]?.latitude)
    const end = projectPoint(points[index]?.longitude, points[index]?.latitude)
    if (!start || !end) {
      continue
    }

    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    if (!Number.isFinite(length) || length < 1) {
      continue
    }

    const angle = Math.atan2(dy, dx)
    segments.push({
      key: `segment-${index}`,
      style: `left:${start.x}px;top:${start.y - width / 2}px;width:${length}px;height:${width}px;background:${color};transform:rotate(${angle}rad);`,
    })
  }

  return segments
})

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
.track-segment,
.marker-dot {
  position: absolute;
}

.tile-image {
  display: block;
}

.tile-annotation {
  pointer-events: none;
}

.track-segment {
  transform-origin: left center;
  border-radius: 999px;
  opacity: 0.9;
  box-shadow: 0 0 0 1px rgba(193, 79, 0, 0.35);
}

.marker-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(31, 147, 255, 0.22);
  border: 2px solid rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 8px rgba(31, 147, 255, 0.12);
}

.marker-core {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #1f93ff;
}

</style>
