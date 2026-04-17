import { AMAP_WEB_KEY, hasAmapKey } from '../config/amap'

function request(url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      data,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        resolve(res.data)
      },
      fail: reject,
    })
  })
}

export function getStaticMapUrl({ longitude, latitude, markers = [], zoom = 11, size = '750*360' }) {
  if (!hasAmapKey() || longitude === undefined || latitude === undefined) {
    return ''
  }

  const markerText = markers
    .map((item) => `${item.size || 'mid'},0xC44536,${item.label || ''}:${item.longitude},${item.latitude}`)
    .join('|')

  return `https://restapi.amap.com/v3/staticmap?key=${encodeURIComponent(AMAP_WEB_KEY)}&size=${encodeURIComponent(size)}&scale=2&zoom=${zoom}&center=${longitude},${latitude}&markers=${encodeURIComponent(markerText)}`
}

export async function reverseGeocode(longitude, latitude, extensions = 'base') {
  if (!hasAmapKey()) {
    return null
  }

  const data = await request('https://restapi.amap.com/v3/geocode/regeo', {
    key: AMAP_WEB_KEY,
    location: `${longitude},${latitude}`,
    extensions,
  })

  if (data.status !== '1' || !data.regeocode) {
    throw new Error(data.info || '逆地理编码失败')
  }

  return data.regeocode
}

function normalizeLocationPart(value) {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim()
  }
  return String(value || '').trim()
}

function compactLocationLabel(parts) {
  return parts
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ')
}

export async function getNearbyLocationOptions(longitude, latitude) {
  if (!hasAmapKey()) {
    return []
  }

  const regeo = await reverseGeocode(longitude, latitude, 'all')
  const address = regeo?.addressComponent || {}
  const city = normalizeLocationPart(address.city) || normalizeLocationPart(address.province)
  const district = normalizeLocationPart(address.district)
  const options = []
  const used = new Set()

  const pushOption = (label, source = '') => {
    const value = compactLocationLabel([city, label])
    if (!value || used.has(value)) {
      return
    }
    used.add(value)
    options.push({
      label: value,
      value,
      source,
    })
  }

  pushOption(compactLocationLabel([district]), 'district')

  const businessAreas = Array.isArray(address.businessAreas) ? address.businessAreas : []
  businessAreas.forEach((item) => {
    pushOption(compactLocationLabel([district, item?.name]), 'business')
  })

  const aois = Array.isArray(regeo?.aois) ? regeo.aois : []
  aois.slice(0, 5).forEach((item) => {
    pushOption(compactLocationLabel([district, item?.name]), 'aoi')
  })

  const pois = Array.isArray(regeo?.pois) ? regeo.pois : []
  pois.slice(0, 8).forEach((item) => {
    pushOption(compactLocationLabel([district, item?.name]), 'poi')
  })

  if (!options.length) {
    pushOption(compactLocationLabel([district]) || normalizeLocationPart(address.province) || '新疆同城', 'fallback')
  }

  return options
}

export async function getLiveWeather(adcode) {
  if (!hasAmapKey() || !adcode) {
    return null
  }

  const data = await request('https://restapi.amap.com/v3/weather/weatherInfo', {
    key: AMAP_WEB_KEY,
    city: adcode,
    extensions: 'base',
  })

  if (data.status !== '1' || !data.lives || !data.lives.length) {
    throw new Error(data.info || '天气获取失败')
  }

  return data.lives[0]
}

export async function getDrivingRoute(origin, destination) {
  if (!hasAmapKey() || !origin || !destination) {
    return null
  }

  const data = await request('https://restapi.amap.com/v3/direction/driving', {
    key: AMAP_WEB_KEY,
    origin: `${origin.longitude},${origin.latitude}`,
    destination: `${destination.longitude},${destination.latitude}`,
    strategy: 0,
    extensions: 'all',
  })

  if (data.status !== '1' || !data.route?.paths?.length) {
    throw new Error(data.info || '驾车路线获取失败')
  }

  return {
    ...data.route.paths[0],
    taxiCost: data.route.taxi_cost || '',
  }
}

export async function getWalkingRoute(origin, destination) {
  if (!hasAmapKey() || !origin || !destination) {
    return null
  }

  const data = await request('https://restapi.amap.com/v3/direction/walking', {
    key: AMAP_WEB_KEY,
    origin: `${origin.longitude},${origin.latitude}`,
    destination: `${destination.longitude},${destination.latitude}`,
  })

  if (data.status !== '1' || !data.route?.paths?.length) {
    throw new Error(data.info || '步行路线获取失败')
  }

  return data.route.paths[0]
}

export async function getCurrentLocation() {
  await ensureLocationPermission()

  const attempts = [
    { label: 'uni-gcj02', run: () => requestUniLocation('gcj02') },
    { label: 'uni-wgs84', run: () => requestUniLocation('wgs84') },
    { label: 'plus-geolocation', run: () => requestPlusLocation() },
  ]

  let lastError = null
  const errors = []
  for (const attempt of attempts) {
    try {
      const location = await attempt.run()
      if (location) {
        console.log(`[hiking-location] success via ${attempt.label}`, location)
        return location
      }
    } catch (error) {
      lastError = error
      const message = normalizeLocationError(error)
      errors.push(`${attempt.label}: ${message}`)
      console.warn(`[hiking-location] failed via ${attempt.label}`, error)
    }
  }

  const detail = errors.length ? `；${errors.join(' | ')}` : ''
  throw new Error(`${normalizeLocationError(lastError) || '定位失败，请检查系统定位服务是否开启'}${detail}`)
}

function normalizeLocationError(error) {
  if (!error) {
    return '定位失败，请检查系统定位服务是否开启'
  }

  if (typeof error === 'string') {
    return error
  }

  const parts = [
    error.errMsg,
    error.message,
    error.reason,
    error.code ? `code=${error.code}` : '',
  ].filter(Boolean)

  const text = parts.join(' | ')
  const raw = JSON.stringify(error)

  if (/auth deny|permission|authorize|获取定位权限失败|code=1501|code=PERMISSION_DENIED/i.test(text + raw)) {
    return '定位权限未开启，请在系统设置中允许“云起天山”访问位置信息'
  }

  if (/service disabled|LOCATION_SWITCH_OFF|gps|定位服务|系统定位服务未开启/i.test(text + raw)) {
    return '系统定位服务未开启，请先打开手机定位开关'
  }

  return text || raw || '定位失败，请检查系统定位服务是否开启'
}

function ensureLocationPermission() {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.os || plus.os.name !== 'Android') {
      resolve()
      return
    }

    const android = plus.android
    if (!android || typeof android.requestPermissions !== 'function') {
      resolve()
      return
    }

    const permissions = [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]

    if (permissions.some((permission) => hasAndroidPermission(permission))) {
      resolve()
      return
    }

    android.requestPermissions(
      permissions,
      (result) => {
        const granted = Array.isArray(result?.granted) ? result.granted : []
        const deniedAlways = Array.isArray(result?.deniedAlways) ? result.deniedAlways : []
        const deniedPresent = Array.isArray(result?.deniedPresent) ? result.deniedPresent : []

        if (
          granted.includes('android.permission.ACCESS_FINE_LOCATION') ||
          granted.includes('android.permission.ACCESS_COARSE_LOCATION') ||
          permissions.some((permission) => hasAndroidPermission(permission))
        ) {
          resolve()
          return
        }

        if (deniedAlways.length || deniedPresent.length) {
          reject(new Error('定位权限未开启，请在系统设置中允许“云起天山”访问位置信息'))
          return
        }

        resolve()
      },
      (error) => {
        reject(new Error(normalizeLocationError(error)))
      }
    )
  })
}

function hasAndroidPermission(permission) {
  if (typeof plus === 'undefined' || !plus.android || !permission) {
    return false
  }

  try {
    const main = plus.android.runtimeMainActivity()
    const PackageManager = plus.android.importClass('android.content.pm.PackageManager')
    return main.checkSelfPermission(permission) === PackageManager.PERMISSION_GRANTED
  } catch (error) {
    return false
  }
}

export function openAppPermissionSettings() {
  if (typeof plus === 'undefined' || !plus.os || plus.os.name !== 'Android' || !plus.android) {
    return false
  }

  try {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Settings = plus.android.importClass('android.provider.Settings')
    const Uri = plus.android.importClass('android.net.Uri')
    const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    intent.setData(Uri.parse(`package:${main.getPackageName()}`))
    main.startActivity(intent)
    return true
  } catch (error) {
    console.warn('[hiking-location] open settings failed', error)
    return false
  }
}

function requestUniLocation(type = 'gcj02') {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type,
      isHighAccuracy: true,
      highAccuracyExpireTime: 12000,
      geocode: false,
      success: resolve,
      fail: reject,
    })
  })
}

function requestPlusLocation() {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.geolocation || typeof plus.geolocation.getCurrentPosition !== 'function') {
      reject(new Error('当前环境不支持 plus 定位'))
      return
    }

    plus.geolocation.getCurrentPosition(
      (position) => {
        const coords = position?.coords || {}
        resolve({
          latitude: Number(coords.latitude),
          longitude: Number(coords.longitude),
          altitude: Number(coords.altitude || 0),
          accuracy: Number(coords.accuracy || 0),
          speed: Number(coords.speed || 0),
          timestamp: Number(position.timestamp || Date.now()),
          provider: 'plus-geolocation',
        })
      },
      (error) => {
        reject(new Error(error?.message || 'plus 定位失败'))
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
        provider: 'system',
        coordsType: 'gcj02',
      },
    )
  })
}

export async function getLocationAndWeather() {
  if (!hasAmapKey()) {
    return null
  }

  const location = await getCurrentLocation()
  const regeo = await reverseGeocode(location.longitude, location.latitude)
  const adcode = regeo?.addressComponent?.adcode
  const weather = adcode ? await getLiveWeather(adcode) : null

  return {
    location,
    regeo,
    weather,
  }
}
