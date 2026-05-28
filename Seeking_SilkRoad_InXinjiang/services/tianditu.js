import {
  DEFAULT_TERRAIN_REGION_ID,
  TIANDITU_KEY,
  TIANDITU_LAYERS,
  TIANDITU_PROVIDER,
  hasTiandituKey,
} from '../config/tianditu'

function buildTileUrl(layer) {
  if (!hasTiandituKey() || !layer) {
    return ''
  }

  return `https://t0.tianditu.gov.cn/DataServer?T=${encodeURIComponent(layer)}&x={x}&y={y}&l={z}&tk=${encodeURIComponent(TIANDITU_KEY)}`
}

export function getTiandituLayerConfig(mode = 'terrain') {
  const config = TIANDITU_LAYERS[mode] || TIANDITU_LAYERS.terrain
  return {
    provider: TIANDITU_PROVIDER,
    mode,
    label: config.label,
    tileUrl: buildTileUrl(config.layer),
    annotationUrl: buildTileUrl(config.annotation),
    ready: hasTiandituKey(),
  }
}

export function getTiandituTerrainConfig() {
  return {
    ...getTiandituLayerConfig('terrain'),
    regionId: DEFAULT_TERRAIN_REGION_ID,
    offlinePackType: 'terrain-contour',
  }
}
