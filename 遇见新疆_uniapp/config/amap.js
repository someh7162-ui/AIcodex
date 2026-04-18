export const AMAP_WEB_KEY = 'c76a2f7390ccb7c9d095cc9ff1408aee'

export function hasAmapKey() {
  return Boolean(AMAP_WEB_KEY) && !AMAP_WEB_KEY.includes('请在这里填入')
}
