const ZENITH_DEGREES = 90.833

export function getSunsetInfo(location, now = new Date()) {
  const latitude = Number(location?.latitude)
  const longitude = Number(location?.longitude)
  const currentDate = now instanceof Date ? now : new Date(now)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Number.isNaN(currentDate.getTime())) {
    return null
  }

  const dayOfYear = getDayOfYear(currentDate)
  const timezoneOffsetMinutes = -currentDate.getTimezoneOffset()
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)
  const equationOfTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  )
  const solarDeclination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma)

  const latitudeRad = latitude * Math.PI / 180
  const zenithRad = ZENITH_DEGREES * Math.PI / 180
  const hourAngleCos = (Math.cos(zenithRad) / (Math.cos(latitudeRad) * Math.cos(solarDeclination)))
    - Math.tan(latitudeRad) * Math.tan(solarDeclination)

  if (hourAngleCos < -1 || hourAngleCos > 1) {
    return null
  }

  const hourAngle = Math.acos(hourAngleCos)
  const solarNoonMinutes = 720 - (4 * longitude) - equationOfTime + timezoneOffsetMinutes
  const sunsetMinutes = solarNoonMinutes + (hourAngle * 180 / Math.PI * 4)
  const sunsetAt = new Date(currentDate)
  sunsetAt.setHours(0, 0, 0, 0)
  sunsetAt.setMinutes(Math.round(sunsetMinutes))

  const minutesToSunset = Math.round((sunsetAt.getTime() - currentDate.getTime()) / 60000)
  return {
    sunsetAt,
    minutesToSunset,
    countdownText: formatSunsetCountdown(minutesToSunset),
    localDateKey: formatLocalDateKey(currentDate),
  }
}

export function formatSunsetTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function formatSunsetCountdown(minutesToSunset) {
  const minutes = Math.round(Number(minutesToSunset))
  if (!Number.isFinite(minutes)) {
    return ''
  }

  if (minutes < 0) {
    const passedMinutes = Math.abs(minutes)
    const hours = Math.floor(passedMinutes / 60)
    const remainMinutes = passedMinutes % 60
    if (hours > 0) {
      return `已过日落 ${hours}小时${remainMinutes}分`
    }
    return `已过日落 ${remainMinutes}分`
  }

  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours > 0) {
    return `距日落还有 ${hours}小时${remainMinutes}分`
  }
  return `距日落还有 ${remainMinutes}分`
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  return Math.floor(diff / 86400000)
}

function formatLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
