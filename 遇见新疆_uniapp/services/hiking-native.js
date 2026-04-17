import { getCurrentLocation } from './amap'

const DEFAULT_PLUGIN_NAME = 'MeetXinjiangHikingMap'
const DEFAULT_MAP_PROVIDER = 'tianditu'
const STANDARD_EVENTS = ['onLocationChange', 'onTrackUpdate', 'onGpsWeak', 'onDeviationAlert', 'onNativeError', 'onOfflineMapReady']
const ENABLE_HIKING_NATIVE_PLUGIN = false

function normalizeMapPayload(payload = {}) {
  return {
    provider: payload.provider || DEFAULT_MAP_PROVIDER,
    ...payload,
  }
}

function resolvePlugin(pluginName = DEFAULT_PLUGIN_NAME) {
  if (!ENABLE_HIKING_NATIVE_PLUGIN) {
    return null
  }

  if (typeof uni === 'undefined' || typeof uni.requireNativePlugin !== 'function') {
    return null
  }

  try {
    const plugin = uni.requireNativePlugin(pluginName)
    return plugin && typeof plugin === 'object' ? plugin : null
  } catch (error) {
    return null
  }
}

async function invoke(plugin, method, payload) {
  if (!plugin || typeof plugin[method] !== 'function') {
    return null
  }

  const result = plugin[method](payload || {})
  if (result && typeof result.then === 'function') {
    return result
  }

  return result
}

function unwrapResult(result) {
  if (!result) {
    return null
  }

  if (typeof result.success === 'boolean') {
    if (!result.success) {
      throw new Error(result.message || result.code || '原生插件调用失败')
    }
    return result.data ?? null
  }

  return result
}

function bindPluginEvent(plugin, eventName, handler) {
  if (!plugin || typeof handler !== 'function') {
    return () => {}
  }

  if (typeof plugin.on === 'function') {
    plugin.on(eventName, handler)
    return () => {
      if (typeof plugin.off === 'function') {
        plugin.off(eventName, handler)
      }
    }
  }

  const addMethod = `add${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}Listener`
  const removeMethod = `remove${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}Listener`

  if (typeof plugin[addMethod] === 'function') {
    plugin[addMethod](handler)
    return () => {
      if (typeof plugin[removeMethod] === 'function') {
        plugin[removeMethod](handler)
      }
    }
  }

  return () => {}
}

export function createHikingNativeBridge(options = {}) {
  const pluginName = options.pluginName || DEFAULT_PLUGIN_NAME
  const plugin = resolvePlugin(pluginName)
  const unsubs = []

  return {
    pluginName,
    isNativeAvailable() {
      return Boolean(plugin)
    },
    async initMap(payload = {}) {
      return unwrapResult(await invoke(plugin, 'initMap', normalizeMapPayload(payload)))
    },
    async destroyMap() {
      while (unsubs.length) {
        const off = unsubs.pop()
        if (typeof off === 'function') {
          off()
        }
      }
      return unwrapResult(await invoke(plugin, 'destroyMap'))
    },
    async refreshLocation(payload = {}) {
      const nativeLocation = unwrapResult(await invoke(plugin, 'getCurrentLocation', payload))
      if (nativeLocation) {
        return nativeLocation
      }
      return getCurrentLocation()
    },
    async moveToCurrentLocation() {
      return unwrapResult(await invoke(plugin, 'moveToCurrentLocation'))
    },
    async setMapMode(mode, payload = {}) {
      return unwrapResult(await invoke(plugin, 'setMapMode', normalizeMapPayload({ ...payload, mode })))
    },
    async startTrack(payload = {}) {
      return unwrapResult(await invoke(plugin, 'startTrack', normalizeMapPayload(payload)))
    },
    async stopTrack() {
      return unwrapResult(await invoke(plugin, 'stopTrack'))
    },
    async clearTrack() {
      return unwrapResult(await invoke(plugin, 'clearTrack'))
    },
    async getTrackSummary() {
      return unwrapResult(await invoke(plugin, 'getTrackSummary'))
    },
    async getTrackPoints(payload = {}) {
      return unwrapResult(await invoke(plugin, 'getTrackPoints', payload))
    },
    async getOfflineMapStatus() {
      return unwrapResult(await invoke(plugin, 'getOfflineMapStatus'))
    },
    async preloadOfflineTerrain(payload = {}) {
      return unwrapResult(await invoke(plugin, 'preloadOfflineTerrain', normalizeMapPayload(payload)))
    },
    on(eventName, handler) {
      const off = bindPluginEvent(plugin, eventName, handler)
      unsubs.push(off)
      return off
    },
    subscribeStandardEvents(handlers = {}) {
      const localUnsubs = STANDARD_EVENTS
        .filter((eventName) => typeof handlers[eventName] === 'function')
        .map((eventName) => {
          const off = bindPluginEvent(plugin, eventName, handlers[eventName])
          unsubs.push(off)
          return off
        })

      return () => {
        localUnsubs.forEach((off) => {
          if (typeof off === 'function') {
            off()
          }
        })
      }
    },
  }
}

export { DEFAULT_PLUGIN_NAME, DEFAULT_MAP_PROVIDER, STANDARD_EVENTS }
