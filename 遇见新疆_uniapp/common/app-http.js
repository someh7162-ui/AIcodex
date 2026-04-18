import { normalizeApiAssetUrl } from '../config/api'

function normalizeLegacyUrl(value) {
  const text = String(value || '')
  if (!text) {
    return ''
  }

  if (/^https?:\/\//i.test(text) || /^(111\.20\.31\.227:34144|frp-arm\.com:44637)(\/|\?|$)/i.test(text) || text.startsWith('/')) {
    return normalizeApiAssetUrl(text)
  }
  return text
}

function normalizePayloadUrls(value) {
  if (Array.isArray(value)) {
    return value.map(normalizePayloadUrls)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizePayloadUrls(item)])
    )
  }

  if (typeof value === 'string') {
    return normalizeLegacyUrl(value)
  }

  return value
}

function parseResponseData(text) {
  const raw = String(text || '')
  if (!raw) {
    return {}
  }

  try {
    return normalizePayloadUrls(JSON.parse(raw))
  } catch (error) {
    return raw
  }
}

function buildRequestBody(data, headers = {}) {
  if (data === undefined || data === null) {
    return null
  }

  const contentType = String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase()
  if (contentType.includes('application/json') && typeof data !== 'string') {
    return JSON.stringify(data)
  }

  return data
}

function canUsePlusRequest(url) {
  return /^https:/i.test(String(url || ''))
    && typeof plus !== 'undefined'
    && plus.net
    && typeof plus.net.XMLHttpRequest === 'function'
}

function plusRequest({ url, method = 'GET', data, headers = {}, timeout = 20000 }) {
  return new Promise((resolve, reject) => {
    const xhr = new plus.net.XMLHttpRequest()
    xhr.timeout = timeout
    xhr.open(method, url)

    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, value)
      }
    })

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) {
        return
      }

      resolve({
        statusCode: Number(xhr.status || 0),
        data: parseResponseData(xhr.responseText),
      })
    }

    xhr.onerror = () => {
      reject(new Error('网络请求失败'))
    }

    xhr.ontimeout = () => {
      reject(new Error('请求超时'))
    }

    xhr.send(buildRequestBody(data, headers))
  })
}

function uniRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => resolve({
        ...res,
        data: normalizePayloadUrls(res.data),
      }),
      fail: (error) => reject(error),
    })
  })
}

export function requestJson(options) {
  if (canUsePlusRequest(options?.url)) {
    return plusRequest(options)
  }

  return uniRequest(options)
}

export function downloadRemoteFile(url) {
  return new Promise((resolve, reject) => {
    const normalizedUrl = normalizeLegacyUrl(url)
    if (
      /^https:/i.test(String(normalizedUrl || ''))
      && typeof plus !== 'undefined'
      && plus.downloader
      && typeof plus.downloader.createDownload === 'function'
    ) {
      const filename = `_doc/cache/image-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const task = plus.downloader.createDownload(normalizedUrl, { filename }, (download, status) => {
        if (status === 200 && download.filename) {
          resolve({ statusCode: status, tempFilePath: download.filename })
          return
        }

        reject(new Error(`下载失败(${status || 0})`))
      })
      task.start()
      return
    }

    uni.downloadFile({
      url: normalizedUrl,
      success: (res) => resolve(res),
      fail: (error) => reject(error),
    })
  })
}
