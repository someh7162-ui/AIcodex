export const AMAP_WEB_KEY = '请在这里填入你的高德Web服务Key'

export function hasAmapKey() {
  return Boolean(AMAP_WEB_KEY) && !AMAP_WEB_KEY.includes('请在这里填入')
}
