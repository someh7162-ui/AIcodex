import { AUTH_API_BASE_URL, hasAuthApiBaseUrl } from '../config/auth'

function request(path, data) {
  return new Promise((resolve, reject) => {
    if (!hasAuthApiBaseUrl()) {
      reject(new Error('认证服务地址未配置，请先在 config/auth.js 中填写 AUTH_API_BASE_URL。'))
      return
    }

    uni.request({
      url: `${AUTH_API_BASE_URL}${path}`,
      method: 'POST',
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
      },
      data,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(res.data?.message || `请求失败(${res.statusCode})`))
          return
        }

        resolve(res.data || {})
      },
      fail: () => {
        reject(new Error('无法连接认证服务，请检查服务器地址或网络。'))
      },
    })
  })
}

export async function loginWithPassword(payload) {
  return request('/auth/login', payload)
}

export async function registerWithPassword(payload) {
  return request('/auth/register', payload)
}
