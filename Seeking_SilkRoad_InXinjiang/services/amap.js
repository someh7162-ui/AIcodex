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

export function getStaticMapUrl({ longitude, latitude, markers = [], paths = [], zoom = 11, size = '750*360' }) {
  if (!hasAmapKey() || longitude === undefined || latitude === undefined) {
    return ''
  }

  const markerText = markers
    .map((item) => `${item.size || 'mid'},0xC44536,${item.label || ''}:${item.longitude},${item.latitude}`)
    .join('|')

  const pathText = paths
    .filter((item) => Array.isArray(item?.points) && item.points.length >= 2)
    .map((item) => {
      const style = [item.weight || 6, item.color || '0xC44536', item.fillColor || '0x00000000']
      const points = item.points
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(';')

      return `${style.join(',')}:${points}`
    })
    .join('|')

  const params = [
    `key=${encodeURIComponent(AMAP_WEB_KEY)}`,
    `size=${encodeURIComponent(size)}`,
    'scale=2',
    `zoom=${zoom}`,
    `center=${longitude},${latitude}`,
  ]

  if (markerText) {
    params.push(`markers=${encodeURIComponent(markerText)}`)
  }

  if (pathText) {
    params.push(`paths=${encodeURIComponent(pathText)}`)
  }

  return `https://restapi.amap.com/v3/staticmap?${params.join('&')}`
}

async function searchPlaceText(keywords, location, city) {
  if (!hasAmapKey() || !keywords) {
    return []
  }

  const cityValue = String(city || '').trim()
  const data = await request('https://restapi.amap.com/v3/place/text', {
    key: AMAP_WEB_KEY,
    keywords,
    offset: 5,
    page: 1,
    extensions: 'base',
    location: location ? `${location.longitude},${location.latitude}` : undefined,
    city: cityValue || undefined,
    citylimit: cityValue ? true : undefined,
  })

  if (data.status !== '1' || !Array.isArray(data.pois)) {
    return []
  }

  return data.pois
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractNavigationAreas(regionText) {
  const raw = String(regionText || '').trim().replace(/^新疆维吾尔自治区/, '').replace(/^新疆/, '').trim()
  if (!raw) {
    return []
  }

  const knownAreas = [
    '乌鲁木齐', '伊犁', '阿勒泰', '喀什', '阿克苏', '吐鲁番', '昌吉', '博州', '巴州', '克拉玛依', '塔城', '哈密', '和田', '克州', '阿拉尔', '图木舒克', '五家渠', '石河子', '北屯', '铁门关', '双河', '可克达拉', '昆玉', '胡杨河',
    '阜康', '布尔津', '博乐', '塔县', '新源', '特克斯', '和静', '库车', '鄯善', '富蕴', '奇台', '昭苏', '温宿', '尉犁', '库尔勒', '沙湾', '霍城', '博湖', '轮台', '泽普', '吐鲁番', '乌鲁木齐', '达坂城',
  ]

  const result = []
  knownAreas.forEach((item) => {
    if (raw.includes(item) && !result.includes(item)) {
      result.push(item)
    }
  })

  if (result.length) {
    return result
  }

  return raw.split(/[\s/、,-]+/).map((item) => item.trim()).filter(Boolean)
}

function buildNavigationSearchKeywords(name, address, region) {
  const values = [
    String(name || '').trim(),
    [name, address].filter(Boolean).join(' '),
    [region, name].filter(Boolean).join(' '),
    [region, address].filter(Boolean).join(' '),
    [region, name, address].filter(Boolean).join(' '),
    String(address || '').trim(),
  ]

  return [...new Set(values.filter(Boolean))]
}

function scoreNavigationPoi(poi, name, address, locationHint) {
  const poiName = normalizeText(poi?.name)
  const poiAddress = normalizeText(poi?.address)
  const targetName = normalizeText(name)
  const targetAddress = normalizeText(address)
  const targetText = `${targetName} ${targetAddress}`
  const poiText = `${poiName} ${poiAddress}`
  let score = 0
  const adminKeywords = ['管理委员会', '管委会', '委员会', '管理处', '政务', '政府', '机关', '旅游局', '办公区']
  const scenicKeywords = ['景区', '风景区', '风景名胜区', '游客中心', '游客服务中心', '游客服务区', '停车场', '入口', '售票处', '检票口']

  if (targetName && poiName === targetName) {
    score += 140
  } else if (targetName && (poiName.includes(targetName) || targetName.includes(poiName))) {
    score += 90
  }

  if (targetAddress && poiAddress.includes(targetAddress)) {
    score += 110
  } else if (targetAddress && targetAddress.includes(poiAddress) && poiAddress) {
    score += 60
  }

  if (scenicKeywords.some((item) => targetText.includes(item)) && scenicKeywords.some((item) => poiText.includes(item))) {
    score += 40
  }

  if (adminKeywords.some((item) => poiText.includes(item)) && !adminKeywords.some((item) => targetText.includes(item))) {
    score -= 260
  }

  if (locationHint && Number.isFinite(Number(locationHint.longitude)) && Number.isFinite(Number(locationHint.latitude))) {
    const distance = getCoordinateDistanceMeters(locationHint, poi)
    if (distance <= 100) {
      score += 80
    } else if (distance <= 500) {
      score += 50
    } else if (distance <= 1500) {
      score += 20
    }
  }

  return score
}

function getCoordinateDistanceMeters(from, to) {
  const rad = Math.PI / 180
  const lat1 = Number(from.latitude) * rad
  const lat2 = Number(to.latitude) * rad
  const deltaLat = lat2 - lat1
  const deltaLng = (Number(to.longitude) - Number(from.longitude)) * rad
  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function resolveNavigationPoint({ name, address = '', region = '', longitude, latitude }) {
  if (!hasAmapKey() || !name) {
    return null
  }

  const locationHint = Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))
    ? { longitude: Number(longitude), latitude: Number(latitude) }
    : null

  const keywordsList = buildNavigationSearchKeywords(name, address, region)
  const cityCandidates = extractNavigationAreas(region || address)
  const candidates = []
  const used = new Set()

  for (const keywords of keywordsList) {
    const citySearches = cityCandidates.length ? [...cityCandidates, ''] : ['']
    for (const city of citySearches) {
      const pois = await searchPlaceText(keywords, locationHint, city)
      pois.forEach((item) => {
        const normalized = normalizePoi(item, keywords)
        if (!normalized) {
          return
        }

        const uniqueKey = `${normalized.name}-${normalized.longitude.toFixed(6)}-${normalized.latitude.toFixed(6)}`
        if (used.has(uniqueKey)) {
          return
        }

        used.add(uniqueKey)
        candidates.push(normalized)
      })
    }
  }

  if (!candidates.length) {
    return null
  }

  return candidates
    .map((item) => ({
      ...item,
      score: scoreNavigationPoi(item, name, address, locationHint),
    }))
    .sort((left, right) => right.score - left.score)[0]
}

async function searchPlaceAround(keyword, location, radius = 5000) {
  if (!hasAmapKey() || !keyword || !location) {
    return []
  }

  const data = await request('https://restapi.amap.com/v3/place/around', {
    key: AMAP_WEB_KEY,
    keywords: keyword,
    location: `${location.longitude},${location.latitude}`,
    radius,
    offset: 8,
    page: 1,
    extensions: 'base',
    sortrule: 'distance',
  })

  if (data.status !== '1' || !Array.isArray(data.pois)) {
    return []
  }

  return data.pois
}

function normalizePoi(item, keyword = '') {
  const [longitude, latitude] = String(item?.location || '')
    .split(',')
    .map((value) => Number(value))

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return {
    id: item.id || `${keyword}-${item.name || ''}-${longitude}-${latitude}`,
    keyword,
    name: item.name || keyword || '景区点位',
    longitude,
    latitude,
    address: item.address || item.pname || item.cityname || '',
    type: item.type || '',
  }
}

export async function searchScenicSupportPoints({ scenicName, longitude, latitude, keywords = [], radius = 6000 }) {
  if (!hasAmapKey() || !scenicName || !Number.isFinite(Number(longitude)) || !Number.isFinite(Number(latitude))) {
    return []
  }

  const location = {
    longitude: Number(longitude),
    latitude: Number(latitude),
  }

  const searchKeywords = Array.isArray(keywords) && keywords.length
    ? keywords
    : ['游客中心', '景区入口', '停车场', '观景台', '服务点', '医务室']

  const results = []
  const used = new Set()

  for (const keyword of searchKeywords) {
    const textPois = await searchPlaceText(`${scenicName}${keyword}`, location)
    const textMatch = textPois
      .map((item) => normalizePoi(item, keyword))
      .find(Boolean)

    const aroundPois = textMatch ? [] : await searchPlaceAround(keyword, location, radius)
    const aroundMatch = aroundPois
      .map((item) => normalizePoi(item, keyword))
      .find(Boolean)

    const matched = textMatch || aroundMatch
    if (!matched) {
      continue
    }

    const uniqueKey = `${matched.name}-${matched.longitude.toFixed(6)}-${matched.latitude.toFixed(6)}`
    if (used.has(uniqueKey)) {
      continue
    }

    used.add(uniqueKey)
    results.push(matched)
  }

  return results
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

export async function getCurrentLocation(options = {}) {
  const preferredProviders = Array.isArray(options.providers)
    ? options.providers.map((item) => String(item || '').toLowerCase()).filter(Boolean)
    : []

  console.log('[hiking-location] getCurrentLocation start', {
    highAccuracy: Boolean(options.highAccuracy),
    allowGpsOffline: Boolean(options.allowGpsOffline),
    coordsType: String(options.coordsType || ''),
    providers: preferredProviders,
    gpsTimeout: Number(options.gpsTimeout || 18000),
    gpsMaximumAgeMs: Number(options.gpsMaximumAgeMs || 120000),
    networkTimeout: Number(options.networkTimeout || 6000),
    networkMaximumAgeMs: Number(options.networkMaximumAgeMs || 30000),
    isAndroidRuntime: isAndroidRuntime(),
  })

  await ensureLocationPermission()

  const attempts = []
  const gpsTimeout = Number(options.gpsTimeout || 18000)
  const networkTimeout = Number(options.networkTimeout || 6000)
  const providerFactories = {
    gps: () => isAndroidRuntime()
      ? {
          label: 'android-gps',
          run: () => requestAndroidProviderLocation('gps', { ...options, timeout: gpsTimeout, maximumAgeMs: Number(options.gpsMaximumAgeMs || 120000) }),
        }
      : null,
    network: () => isAndroidRuntime()
      ? {
          label: 'android-network',
          run: () => requestAndroidProviderLocation('network', { ...options, timeout: networkTimeout, maximumAgeMs: Number(options.networkMaximumAgeMs || 30000) }),
        }
      : null,
    system: () => ({ label: 'plus-geolocation', run: () => requestPlusLocation(options) }),
    'plus-geolocation': () => ({ label: 'plus-geolocation', run: () => requestPlusLocation(options) }),
    gcj02: () => ({ label: 'uni-gcj02', run: () => requestUniLocation('gcj02') }),
    'uni-gcj02': () => ({ label: 'uni-gcj02', run: () => requestUniLocation('gcj02') }),
    wgs84: () => ({ label: 'uni-wgs84', run: () => requestUniLocation('wgs84') }),
    'uni-wgs84': () => ({ label: 'uni-wgs84', run: () => requestUniLocation('wgs84') }),
  }

  const fallbackProviderOrder = isAndroidRuntime()
    ? ['gps', 'network', 'system', 'gcj02', 'wgs84']
    : ['system', 'gcj02', 'wgs84']
  const providerOrder = preferredProviders.length ? preferredProviders : fallbackProviderOrder
  const seenLabels = new Set()

  providerOrder.forEach((providerName) => {
    const factory = providerFactories[providerName]
    if (!factory) {
      return
    }
    const attempt = factory()
    if (!attempt || seenLabels.has(attempt.label)) {
      return
    }
    seenLabels.add(attempt.label)
    attempts.push(attempt)
  })

  console.log('[hiking-location] attempts prepared', attempts.map((item) => item.label))

  let lastError = null
  const errors = []
  for (const attempt of attempts) {
    try {
      console.log(`[hiking-location] trying ${attempt.label}`)
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
  console.error('[hiking-location] all attempts failed', errors)
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
    return '定位权限未开启，请在系统设置中允许“丝路疆寻”访问位置信息'
  }

  if (/service disabled|LOCATION_SWITCH_OFF|gps|定位服务|系统定位服务未开启/i.test(text + raw)) {
    return '系统定位服务未开启，请先打开手机定位开关'
  }

  return text || raw || '定位失败，请检查系统定位服务是否开启'
}

function isAndroidRuntime() {
  return typeof plus !== 'undefined' && plus.os && plus.os.name === 'Android' && plus.android
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
          reject(new Error('定位权限未开启，请在系统设置中允许“丝路疆寻”访问位置信息'))
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
    console.log(`[hiking-location] uni.getLocation start (${type})`)
    uni.getLocation({
      type,
      isHighAccuracy: true,
      highAccuracyExpireTime: 12000,
      geocode: false,
      success: (location) => {
        resolve({
          ...location,
          provider: `uni-${type}`,
          coordinateSystem: type,
          source: 'uni.getLocation',
        })
      },
      fail: reject,
    })
  })
}

function requestPlusLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.geolocation || typeof plus.geolocation.getCurrentPosition !== 'function') {
      reject(new Error('当前环境不支持 plus 定位'))
      return
    }

    const requestedCoordsType = String(options.coordsType || 'gcj02').toLowerCase()
    const plusCoordsType = requestedCoordsType === 'wgs84' ? 'gcj02' : requestedCoordsType

    console.log('[hiking-location] plus.geolocation start', {
      timeout: Number(options.timeout || 12000),
      coordsType: plusCoordsType,
    })

    plus.geolocation.getCurrentPosition(
      (position) => {
        const coords = position?.coords || {}
        resolve({
          latitude: Number(coords.latitude),
          longitude: Number(coords.longitude),
          altitude: Number(coords.altitude || 0),
          accuracy: Number(coords.accuracy || 0),
          speed: Number(coords.speed || 0),
          bearing: Number(coords.heading || 0),
          timestamp: Number(position.timestamp || Date.now()),
          provider: String(coords.provider || position.provider || 'plus-geolocation'),
          coordinateSystem: String(position.coordsType || plusCoordsType || 'gcj02'),
          source: 'plus.geolocation',
        })
      },
      (error) => {
        reject(new Error(error?.message || 'plus 定位失败'))
      },
      {
        enableHighAccuracy: true,
        timeout: Number(options.timeout || 12000),
        maximumAge: 0,
        provider: 'system',
        coordsType: plusCoordsType,
      },
    )
  })
}

function requestAndroidProviderLocation(providerName, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isAndroidRuntime()) {
      reject(new Error('当前环境不支持 Android 原生定位'))
      return
    }

    let locationManager = null
    let listener = null
    let timer = null
    let finished = false

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }

      if (locationManager && listener) {
        try {
          locationManager.removeUpdates(listener)
        } catch (error) {
          // ignore cleanup failure
        }
      }

      listener = null
      locationManager = null
    }

    const finishResolve = (value) => {
      if (finished) {
        return
      }
      finished = true
      cleanup()
      resolve(value)
    }

    const finishReject = (error) => {
      if (finished) {
        return
      }
      finished = true
      cleanup()
      reject(error)
    }

    try {
      console.log('[hiking-location] android provider start', {
        providerName,
        timeout: Number(options.timeout || (providerName === 'gps' ? 8000 : 5000)),
        maximumAgeMs: Number(options.maximumAgeMs || 15000),
      })

      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context')
      plus.android.importClass('android.location.LocationManager')
      const locationManagerObject = main.getSystemService(Context.LOCATION_SERVICE)
      plus.android.importClass(locationManagerObject)
      locationManager = locationManagerObject

      if (!locationManager || !locationManager.isProviderEnabled(providerName)) {
        finishReject(new Error(providerName === 'gps' ? 'GPS 未开启' : '网络定位不可用'))
        return
      }

      const cached = normalizeAndroidLocation(locationManager.getLastKnownLocation(providerName), providerName, 'android-last-known')
      const maximumAgeMs = Number(options.maximumAgeMs || 15000)
      if (cached && Date.now() - cached.timestamp <= maximumAgeMs) {
        console.log('[hiking-location] android provider cached hit', {
          providerName,
          ageMs: Date.now() - cached.timestamp,
          accuracy: cached.accuracy,
          source: cached.source,
        })
        finishResolve(cached)
        return
      }

      listener = plus.android.implements('android.location.LocationListener', {
        onLocationChanged(location) {
          const normalized = normalizeAndroidLocation(location, providerName, 'android-live')
          if (normalized) {
            finishResolve(normalized)
          }
        },
        onProviderDisabled(name) {
          finishReject(new Error(`${String(name || providerName).toUpperCase()} 已关闭`))
        },
        onProviderEnabled() {},
        onStatusChanged() {},
      })

      const timeout = Number(options.timeout || (providerName === 'gps' ? 8000 : 5000))
      timer = setTimeout(() => {
        const lastKnown = normalizeAndroidLocation(locationManager.getLastKnownLocation(providerName), providerName, 'android-timeout-last-known')
        if (lastKnown) {
          console.warn('[hiking-location] android provider timeout fallback', {
            providerName,
            ageMs: Date.now() - lastKnown.timestamp,
            accuracy: lastKnown.accuracy,
            source: lastKnown.source,
          })
          finishResolve(lastKnown)
          return
        }
        finishReject(new Error(`${providerName.toUpperCase()} 定位超时`))
      }, timeout)

      if (typeof locationManager.requestSingleUpdate === 'function') {
        locationManager.requestSingleUpdate(providerName, listener, main.getMainLooper())
        return
      }

      locationManager.requestLocationUpdates(providerName, 0, 0, listener, main.getMainLooper())
    } catch (error) {
      finishReject(new Error(normalizeLocationError(error)))
    }
  })
}

function normalizeAndroidLocation(location, providerName, source) {
  if (!location) {
    return null
  }

  try {
    plus.android.importClass(location)
  } catch (error) {
    return null
  }

  const latitude = Number(location.getLatitude())
  const longitude = Number(location.getLongitude())
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const altitude = typeof location.hasAltitude === 'function' && location.hasAltitude()
    ? Number(location.getAltitude())
    : 0
  const accuracy = typeof location.hasAccuracy === 'function' && location.hasAccuracy()
    ? Number(location.getAccuracy())
    : 0
  const speed = typeof location.hasSpeed === 'function' && location.hasSpeed()
    ? Number(location.getSpeed())
    : 0
  const bearing = typeof location.hasBearing === 'function' && location.hasBearing()
    ? Number(location.getBearing())
    : 0
  const timestamp = Number(location.getTime ? location.getTime() : Date.now())
  const provider = String(location.getProvider ? location.getProvider() : providerName || 'android-location')

  return {
    latitude,
    longitude,
    altitude,
    accuracy,
    speed,
    bearing,
    timestamp,
    provider,
    coordinateSystem: 'wgs84',
    source,
  }
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
