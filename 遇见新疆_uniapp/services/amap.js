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

export function getStaticMapUrl({ longitude, latitude, markers = [] }) {
  if (!hasAmapKey() || longitude === undefined || latitude === undefined) {
    return ''
  }

  const markerText = markers
    .map((item) => `${item.size || 'mid'},0xC44536,${item.label || ''}:${item.longitude},${item.latitude}`)
    .join('|')

  return `https://restapi.amap.com/v3/staticmap?key=${encodeURIComponent(AMAP_WEB_KEY)}&size=750*360&scale=2&zoom=11&center=${longitude},${latitude}&markers=${encodeURIComponent(markerText)}`
}

export async function reverseGeocode(longitude, latitude) {
  if (!hasAmapKey()) {
    return null
  }

  const data = await request('https://restapi.amap.com/v3/geocode/regeo', {
    key: AMAP_WEB_KEY,
    location: `${longitude},${latitude}`,
    extensions: 'base',
  })

  if (data.status !== '1' || !data.regeocode) {
    throw new Error(data.info || '逆地理编码失败')
  }

  return data.regeocode
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

export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: resolve,
      fail: reject,
    })
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
