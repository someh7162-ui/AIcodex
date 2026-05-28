const PI = Math.PI
const AXIS = 6378245.0
const OFFSET = 0.006693421622965943

export function gcj02ToWgs84(longitude, latitude) {
  const lng = Number(longitude)
  const lat = Number(latitude)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  if (isOutOfChina(lng, lat)) {
    return { longitude: lng, latitude: lat }
  }

  const delta = calcDelta(lng, lat)
  return {
    longitude: lng * 2 - delta.longitude,
    latitude: lat * 2 - delta.latitude,
  }
}

export function wgs84ToGcj02(longitude, latitude) {
  const lng = Number(longitude)
  const lat = Number(latitude)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  if (isOutOfChina(lng, lat)) {
    return { longitude: lng, latitude: lat }
  }

  return calcDelta(lng, lat)
}

function isOutOfChina(longitude, latitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271
}

function calcDelta(longitude, latitude) {
  let dLat = transformLat(longitude - 105.0, latitude - 35.0)
  let dLng = transformLng(longitude - 105.0, latitude - 35.0)
  const radLat = latitude / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - OFFSET * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((AXIS * (1 - OFFSET)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (AXIS / sqrtMagic * Math.cos(radLat) * PI)

  return {
    longitude: longitude + dLng,
    latitude: latitude + dLat,
  }
}

function transformLat(longitude, latitude) {
  let value = -100.0 + 2.0 * longitude + 3.0 * latitude + 0.2 * latitude * latitude
  value += 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude))
  value += (20.0 * Math.sin(6.0 * longitude * PI) + 20.0 * Math.sin(2.0 * longitude * PI)) * 2.0 / 3.0
  value += (20.0 * Math.sin(latitude * PI) + 40.0 * Math.sin(latitude / 3.0 * PI)) * 2.0 / 3.0
  value += (160.0 * Math.sin(latitude / 12.0 * PI) + 320 * Math.sin(latitude * PI / 30.0)) * 2.0 / 3.0
  return value
}

function transformLng(longitude, latitude) {
  let value = 300.0 + longitude + 2.0 * latitude + 0.1 * longitude * longitude
  value += 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude))
  value += (20.0 * Math.sin(6.0 * longitude * PI) + 20.0 * Math.sin(2.0 * longitude * PI)) * 2.0 / 3.0
  value += (20.0 * Math.sin(longitude * PI) + 40.0 * Math.sin(longitude / 3.0 * PI)) * 2.0 / 3.0
  value += (150.0 * Math.sin(longitude / 12.0 * PI) + 300.0 * Math.sin(longitude / 30.0 * PI)) * 2.0 / 3.0
  return value
}
