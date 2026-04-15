export const AMAP_WEB_KEY = 'b16ee0a6a8f641e974a51521ca00b6f0'

export function hasAmapKey() {
  return Boolean(AMAP_WEB_KEY) && !AMAP_WEB_KEY.includes('请在这里填入')
}
