import { normalizeLocation } from './hiking-metrics'
import { getTiandituLayerConfig } from '../services/tianditu'

const TILE_PACK_STORAGE_KEY = 'meet-xinjiang-hiking-tile-packs'
const OFFLINE_TILE_ROOT = '_doc/offline-tiles'
export const DEFAULT_HIKING_TILE_PACK_ID = 'hiking-active-area'

function getPackStore() {
  try {
    const raw = uni.getStorageSync(TILE_PACK_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    return {}
  }
}

function savePackStore(store) {
  uni.setStorageSync(TILE_PACK_STORAGE_KEY, JSON.stringify(store || {}))
}

export function getOfflineTilePack(packId = DEFAULT_HIKING_TILE_PACK_ID) {
  const store = getPackStore()
  return store[String(packId)] || null
}

export function saveOfflineTilePack(packId, record) {
  const store = getPackStore()
  store[String(packId)] = record
  savePackStore(store)
  return record
}

export function removeOfflineTilePack(packId = DEFAULT_HIKING_TILE_PACK_ID) {
  const store = getPackStore()
  delete store[String(packId)]
  savePackStore(store)
}

export function resolveOfflineTileSource({ packId = DEFAULT_HIKING_TILE_PACK_ID, mode = 'imagery', layerType = 'base', x, y, z, fallbackUrl = '' }) {
  const pack = getOfflineTilePack(packId)
  if (!pack || pack.status !== 'ready') {
    return fallbackUrl
  }

  if (!Array.isArray(pack.zooms) || !pack.zooms.includes(Number(z))) {
    return fallbackUrl
  }

  if (!Array.isArray(pack.layers) || !pack.layers.includes(mode) || (layerType === 'annotation' && !pack.hasAnnotation)) {
    return fallbackUrl
  }

  const relativePath = buildTileRelativePath(packId, mode, layerType, z, x, y)
  if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
    const absolutePath = plus.io.convertLocalFileSystemURL(relativePath)
    if (absolutePath) {
      return absolutePath.startsWith('file://') ? absolutePath : `file://${absolutePath}`
    }
  }
  return relativePath
}

export function getOfflineTilePackSummary(packId = DEFAULT_HIKING_TILE_PACK_ID) {
  const pack = getOfflineTilePack(packId)
  if (!pack) {
    return { ready: false, text: '未下载离线底图' }
  }
  if (pack.status === 'downloading') {
    return { ready: false, text: `离线底图下载中 ${Math.round(Number(pack.progress || 0))}%` }
  }
  if (pack.status === 'ready') {
    return { ready: true, text: '离线底图已就绪' }
  }
  return { ready: false, text: '离线底图未完成' }
}

export function buildHikingTilePackPlan({
  packId = DEFAULT_HIKING_TILE_PACK_ID,
  name = '徒步区域离线底图',
  points = [],
  center = null,
  minZoom = 12,
  maxZoom = 16,
  mode = 'imagery',
  paddingKm = 2,
} = {}) {
  const normalizedPoints = [
    ...(Array.isArray(points) ? points : []).map(normalizeLocation).filter(Boolean),
    normalizeLocation(center),
  ].filter(Boolean)

  if (!normalizedPoints.length) {
    throw new Error('当前没有可用于下载离线底图的定位范围')
  }

  const bounds = expandBounds(computeBounds(normalizedPoints), paddingKm)
  const zooms = []
  for (let zoom = Math.max(3, Number(minZoom || 12)); zoom <= Math.min(18, Number(maxZoom || 16)); zoom += 1) {
    zooms.push(zoom)
  }

  const tileList = buildTileTaskList({ packId, bounds, zooms, mode })

  return {
    packId,
    name,
    mode,
    zooms,
    bounds,
    tasks: tileList,
  }
}

export async function downloadOfflineTilePack(plan, options = {}) {
  if (!plan || !Array.isArray(plan.tasks) || !plan.tasks.length) {
    throw new Error('离线底图任务为空')
  }

  const existing = getOfflineTilePack(plan.packId)
  saveOfflineTilePack(plan.packId, {
    ...existing,
    packId: plan.packId,
    name: plan.name,
    mode: plan.mode,
    zooms: plan.zooms,
    bounds: plan.bounds,
    layers: [plan.mode],
    hasAnnotation: plan.tasks.some((task) => task.layerType === 'annotation'),
    totalTiles: plan.tasks.length,
    downloadedTiles: 0,
    progress: 0,
    status: 'downloading',
    updatedAt: Date.now(),
  })

  let downloadedTiles = 0
  let sizeBytes = 0
  const concurrency = Math.max(1, Math.min(6, Number(options.concurrency || 4)))
  let cursor = 0
  let aborted = false

  async function worker() {
    while (!aborted && cursor < plan.tasks.length) {
      const task = plan.tasks[cursor]
      cursor += 1
      const bytes = await downloadTask(task)
      if (aborted) {
        return
      }
      sizeBytes += bytes
      downloadedTiles += 1
      const progress = Math.min(100, (downloadedTiles / plan.tasks.length) * 100)
      saveOfflineTilePack(plan.packId, {
        ...getOfflineTilePack(plan.packId),
        downloadedTiles,
        progress,
        sizeBytes,
        status: downloadedTiles >= plan.tasks.length ? 'ready' : 'downloading',
        updatedAt: Date.now(),
      })
      if (typeof options.onProgress === 'function') {
        options.onProgress({ downloadedTiles, totalTiles: plan.tasks.length, progress })
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  } catch (error) {
    aborted = true
    saveOfflineTilePack(plan.packId, {
      ...getOfflineTilePack(plan.packId),
      status: 'error',
      errorMessage: error?.message || '离线底图下载失败',
      updatedAt: Date.now(),
    })
    throw error
  }

  const record = {
    ...getOfflineTilePack(plan.packId),
    status: 'ready',
    progress: 100,
    sizeBytes,
    errorMessage: '',
    updatedAt: Date.now(),
  }
  saveOfflineTilePack(plan.packId, record)
  return record
}

export async function deleteOfflineTilePack(packId = DEFAULT_HIKING_TILE_PACK_ID) {
  const relativeRoot = `${OFFLINE_TILE_ROOT}/${encodeURIComponent(String(packId))}`
  await removeRelativePath(relativeRoot).catch(() => {})
  removeOfflineTilePack(packId)
}

function buildTileTaskList({ packId, bounds, zooms, mode }) {
  const config = getTiandituLayerConfig(mode)
  if (!config.tileUrl) {
    throw new Error('离线底图服务未配置')
  }

  const tasks = []
  zooms.forEach((zoom) => {
    const { minX, maxX, minY, maxY } = getTileRange(bounds, zoom)
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        tasks.push({
          url: fillTileUrl(config.tileUrl, x, y, zoom),
          relativePath: buildTileRelativePath(packId, mode, 'base', zoom, x, y),
          x,
          y,
          z: zoom,
          layerType: 'base',
          mode,
        })
        if (config.annotationUrl) {
          tasks.push({
            url: fillTileUrl(config.annotationUrl, x, y, zoom),
            relativePath: buildTileRelativePath(packId, mode, 'annotation', zoom, x, y),
            x,
            y,
            z: zoom,
            layerType: 'annotation',
            mode,
          })
        }
      }
    }
  })

  return tasks
}

async function downloadTask(task) {
  const fileExists = await checkRelativePathExists(task.relativePath)
  if (fileExists) {
    return 0
  }

  if (typeof plus !== 'undefined' && plus.downloader && typeof plus.downloader.createDownload === 'function') {
    return new Promise((resolve, reject) => {
      const downloadTask = plus.downloader.createDownload(task.url, { filename: task.relativePath }, (download, status) => {
        if (status === 200) {
          resolve(Number(download.downloadedSize || 0))
          return
        }
        reject(new Error(`瓦片下载失败 (${status || 0})`))
      })
      downloadTask.start()
    })
  }

  const response = await downloadByUni(task.url)
  if (Number(response?.statusCode) !== 200 || !response.tempFilePath) {
    throw new Error('瓦片下载失败')
  }
  const savedFilePath = await saveDownloadedFile(response.tempFilePath, task.relativePath)
  return Number(response?.totalBytesWritten || response?.totalBytesExpectedToWrite || 0) || (savedFilePath ? 1 : 0)
}

function downloadByUni(url) {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: resolve,
      fail: reject,
    })
  })
}

function saveDownloadedFile(tempFilePath, relativePath) {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io || typeof plus.io.resolveLocalFileSystemURL !== 'function') {
      uni.saveFile({
        tempFilePath,
        success: ({ savedFilePath }) => resolve(savedFilePath || ''),
        fail: reject,
      })
      return
    }

    ensureRelativeDirectory(relativePath).then(() => {
      plus.io.resolveLocalFileSystemURL(tempFilePath, (entry) => {
        if (!entry || typeof entry.copyTo !== 'function') {
          reject(new Error('临时瓦片文件不可用'))
          return
        }

        const targetDirectory = getRelativeDirectory(relativePath)
        const targetName = getRelativeFilename(relativePath)
        plus.io.resolveLocalFileSystemURL(targetDirectory, (directoryEntry) => {
          entry.copyTo(directoryEntry, targetName, (copiedEntry) => {
            resolve(copiedEntry?.fullPath || relativePath)
          }, reject)
        }, reject)
      }, reject)
    }).catch(reject)
  })
}

function ensureRelativeDirectory(relativePath) {
  const normalized = getRelativeDirectory(relativePath)
  const segments = normalized.split('/').filter(Boolean)

  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io || typeof plus.io.requestFileSystem !== 'function') {
      resolve()
      return
    }

    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fileSystem) => {
      let current = fileSystem.root
      const pathSegments = segments.slice(1)

      function step(index) {
        if (index >= pathSegments.length) {
          resolve(current)
          return
        }

        current.getDirectory(pathSegments[index], { create: true }, (directoryEntry) => {
          current = directoryEntry
          step(index + 1)
        }, reject)
      }

      step(0)
    }, reject)
  })
}

function getRelativeDirectory(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/')
  const lastSlashIndex = normalized.lastIndexOf('/')
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : normalized
}

function getRelativeFilename(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/')
  const lastSlashIndex = normalized.lastIndexOf('/')
  return lastSlashIndex >= 0 ? normalized.slice(lastSlashIndex + 1) : normalized
}

function checkRelativePathExists(relativePath) {
  return new Promise((resolve) => {
    if (typeof plus === 'undefined' || !plus.io || typeof plus.io.resolveLocalFileSystemURL !== 'function') {
      resolve(false)
      return
    }
    plus.io.resolveLocalFileSystemURL(relativePath, () => resolve(true), () => resolve(false))
  })
}

function removeRelativePath(relativePath) {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io || typeof plus.io.resolveLocalFileSystemURL !== 'function') {
      resolve()
      return
    }
    plus.io.resolveLocalFileSystemURL(relativePath, (entry) => {
      if (entry && typeof entry.removeRecursively === 'function') {
        entry.removeRecursively(resolve, reject)
        return
      }
      if (entry && typeof entry.remove === 'function') {
        entry.remove(resolve, reject)
        return
      }
      resolve()
    }, () => resolve())
  })
}

function buildTileRelativePath(packId, mode, layerType, z, x, y) {
  return `${OFFLINE_TILE_ROOT}/${encodeURIComponent(String(packId))}/${mode}/${layerType}/${z}/${x}/${y}.png`
}

function fillTileUrl(template, x, y, z) {
  return String(template || '')
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z))
}

function getTileRange(bounds, zoom) {
  const northWest = lngLatToTile(bounds.west, bounds.north, zoom)
  const southEast = lngLatToTile(bounds.east, bounds.south, zoom)
  return {
    minX: Math.min(northWest.x, southEast.x),
    maxX: Math.max(northWest.x, southEast.x),
    minY: Math.min(northWest.y, southEast.y),
    maxY: Math.max(northWest.y, southEast.y),
  }
}

function lngLatToTile(longitude, latitude, zoom) {
  const boundedLat = Math.max(-85.05112878, Math.min(85.05112878, Number(latitude || 0)))
  const total = 2 ** zoom
  const x = Math.floor(((Number(longitude || 0) + 180) / 360) * total)
  const rad = boundedLat * Math.PI / 180
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * total)
  return { x, y }
}

function computeBounds(points) {
  return points.reduce((bounds, point) => ({
    north: Math.max(bounds.north, point.latitude),
    south: Math.min(bounds.south, point.latitude),
    east: Math.max(bounds.east, point.longitude),
    west: Math.min(bounds.west, point.longitude),
  }), {
    north: points[0].latitude,
    south: points[0].latitude,
    east: points[0].longitude,
    west: points[0].longitude,
  })
}

function expandBounds(bounds, paddingKm) {
  const centerLat = (bounds.north + bounds.south) / 2
  const latPadding = Number(paddingKm || 0) / 111
  const lngPadding = Number(paddingKm || 0) / (111 * Math.max(0.2, Math.cos(centerLat * Math.PI / 180)))
  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding,
  }
}
