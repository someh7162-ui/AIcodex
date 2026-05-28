const listeners = new Set()
let isListening = false
let compassBound = false
let lastHeading = null
let stopFallbackWatch = null

export function startCompass() {
  if (isListening) {
    return Promise.resolve()
  }

  bindCompassListener()

  return startUniCompass().then((started) => {
    if (started) {
      isListening = true
      return true
    }

    const fallbackStarted = startPlusCompassFallback()
    isListening = fallbackStarted
    return fallbackStarted
  })
}

export function stopCompass() {
  if (!isListening) {
    return Promise.resolve()
  }

  isListening = false
  if (typeof stopFallbackWatch === 'function') {
    stopFallbackWatch()
    stopFallbackWatch = null
  }

  return new Promise((resolve) => {
    if (typeof uni.stopCompass !== 'function') {
      resolve()
      return
    }
    uni.stopCompass({ complete: resolve })
  })
}

export function subscribeCompass(callback) {
  if (typeof callback !== 'function') {
    return () => {}
  }

  listeners.add(callback)
  if (Number.isFinite(lastHeading)) {
    callback({ heading: lastHeading, text: formatCompassHeading(lastHeading), source: 'sensor' })
  }

  return () => {
    listeners.delete(callback)
  }
}

export function formatCompassHeading(value) {
  const heading = normalizeHeading(value)
  if (!Number.isFinite(heading)) {
    return '方向校准中'
  }

  const segments = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  const index = Math.round(heading / 45) % segments.length
  return `${segments[index]} ${Math.round(heading)}°`
}

function bindCompassListener() {
  if (compassBound || typeof uni.onCompassChange !== 'function') {
    return
  }

  uni.onCompassChange((event) => {
    emitHeading(normalizeHeading(event?.direction), 'sensor')
  })

  compassBound = true
}

function startUniCompass() {
  return new Promise((resolve) => {
    if (typeof uni.startCompass !== 'function') {
      resolve(false)
      return
    }

    uni.startCompass({
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

function startPlusCompassFallback() {
  // #ifdef APP-PLUS
  if (typeof plus === 'undefined' || !plus.orientation || typeof plus.orientation.watchOrientation !== 'function') {
    return false
  }

  try {
    const watchId = plus.orientation.watchOrientation((event) => {
      const nextHeading = normalizeHeading(
        event?.magneticHeading
        ?? event?.trueHeading
        ?? event?.heading
        ?? event?.direction
        ?? event?.alpha
      )
      emitHeading(nextHeading, 'plus.orientation')
    }, () => {}, {
      frequency: 200,
    })

    stopFallbackWatch = () => {
      try {
        plus.orientation.clearWatch(watchId)
      } catch (error) {
        // ignore clear failures
      }
    }

    return true
  } catch (error) {
    stopFallbackWatch = null
    return false
  }
  // #endif

  return false
}

function emitHeading(nextHeading, source) {
  if (!Number.isFinite(nextHeading)) {
    return
  }

  if (Number.isFinite(lastHeading) && getHeadingDelta(lastHeading, nextHeading) < 2) {
    return
  }

  lastHeading = nextHeading
  const payload = {
    heading: nextHeading,
    text: formatCompassHeading(nextHeading),
    source,
  }
  listeners.forEach((listener) => listener(payload))
}

function normalizeHeading(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return NaN
  }
  const normalized = ((numeric % 360) + 360) % 360
  return normalized
}

function getHeadingDelta(previous, next) {
  const direct = Math.abs(next - previous)
  return Math.min(direct, 360 - direct)
}
