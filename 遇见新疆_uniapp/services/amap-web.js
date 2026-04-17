import { AMAP_WEB_KEY, hasAmapKey } from '../config/amap'
import { getTiandituLayerConfig } from './tianditu'

const AMAP_JS_URL = 'https://webapi.amap.com/maps'

let amapSdkPromise = null

function buildAmapScriptUrl() {
  const params = new URLSearchParams({
    v: '2.0',
    key: AMAP_WEB_KEY,
  })

  return `${AMAP_JS_URL}?${params.toString()}`
}

function replaceTileTemplate(urlTemplate, x, y, z) {
  return String(urlTemplate || '')
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z))
}

export async function loadAmapWebSdk() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  if (!hasAmapKey()) {
    throw new Error('缺少高德 Web Key，无法加载 AMap JS API')
  }

  if (window.AMap) {
    return window.AMap
  }

  if (!amapSdkPromise) {
    amapSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-amap-web-sdk="1"]')
      if (existing) {
        existing.addEventListener('load', () => resolve(window.AMap))
        existing.addEventListener('error', () => reject(new Error('AMap JS API 加载失败')))
        return
      }

      const script = document.createElement('script')
      script.src = buildAmapScriptUrl()
      script.async = true
      script.defer = true
      script.dataset.amapWebSdk = '1'
      script.onload = () => resolve(window.AMap)
      script.onerror = () => reject(new Error('AMap JS API 加载失败'))
      document.head.appendChild(script)
    })
  }

  return amapSdkPromise
}

export function createAmapTiandituLayers(AMap, mode = 'terrain') {
  const config = getTiandituLayerConfig(mode)
  if (!AMap || !config.ready || !config.tileUrl) {
    return []
  }

  const layers = [
    new AMap.TileLayer({
      zIndex: 120,
      opacity: mode === 'terrain' ? 0.92 : 1,
      getTileUrl(x, y, z) {
        return replaceTileTemplate(config.tileUrl, x, y, z)
      },
    }),
  ]

  if (config.annotationUrl) {
    layers.push(new AMap.TileLayer({
      zIndex: 121,
      opacity: 1,
      getTileUrl(x, y, z) {
        return replaceTileTemplate(config.annotationUrl, x, y, z)
      },
    }))
  }

  return layers
}

export function createAmapPoint(longitude, latitude, AMap) {
  if (!AMap) {
    return null
  }

  const lng = Number(longitude)
  const lat = Number(latitude)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return new AMap.LngLat(lng, lat)
}
