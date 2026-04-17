const OFFLINE_MAP_STORAGE_KEY = 'meet-xinjiang-offline-maps'

function getOfflineMapStore() {
  const raw = uni.getStorageSync(OFFLINE_MAP_STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    return {}
  }
}

function saveOfflineMapStore(store) {
  uni.setStorageSync(OFFLINE_MAP_STORAGE_KEY, JSON.stringify(store || {}))
}

export function getOfflineMapRecord(destinationId) {
  const store = getOfflineMapStore()
  return store[String(destinationId)] || null
}

export function saveOfflineMapRecord(destinationId, record) {
  const store = getOfflineMapStore()
  store[String(destinationId)] = record
  saveOfflineMapStore(store)
}

export function removeOfflineMapRecord(destinationId) {
  const store = getOfflineMapStore()
  delete store[String(destinationId)]
  saveOfflineMapStore(store)
}

export async function downloadOfflineMap({ destinationId, scenicName, mapUrl, version, metadata }) {
  if (!destinationId || !mapUrl) {
    throw new Error('离线地图资源不存在。')
  }

  const downloadRes = await uni.downloadFile({
    url: mapUrl,
  })

  if (downloadRes.statusCode !== 200 || !downloadRes.tempFilePath) {
    throw new Error('离线地图下载失败，请稍后重试。')
  }

  const saveRes = await uni.saveFile({
    tempFilePath: downloadRes.tempFilePath,
  })

  if (!saveRes.savedFilePath) {
    throw new Error('离线地图保存失败，请检查设备存储空间。')
  }

  const record = {
    destinationId: String(destinationId),
    scenicName: scenicName || '景区离线地图',
    savedFilePath: saveRes.savedFilePath,
    sourceUrl: mapUrl,
    version: version || 'v1',
    downloadedAt: Date.now(),
    metadata: metadata || null,
  }

  saveOfflineMapRecord(destinationId, record)

  return record
}

export async function deleteOfflineMap(destinationId) {
  const record = getOfflineMapRecord(destinationId)

  if (record?.savedFilePath) {
    try {
      await uni.removeSavedFile({
        filePath: record.savedFilePath,
      })
    } catch (error) {
      // ignore missing file and still clear storage index
    }
  }

  removeOfflineMapRecord(destinationId)
}
