export const AMAP_WEB_KEY = 'b16ee0a6a8f641e974a51521ca00b6f0'
export const AMAP_SECURITY_JS_CODE = '27cce8a4c1772a6589c3ee78cf2f31e7'

export function hasAmapKey() {
  return Boolean(AMAP_WEB_KEY) && !AMAP_WEB_KEY.includes('请在这里填入')
}

export function hasAmapSecurityCode() {
  return Boolean(AMAP_SECURITY_JS_CODE) && !AMAP_SECURITY_JS_CODE.includes('请在这里填入')
}

export function applyAmapSecurityConfig(target = globalThis) {
  if (!target || !hasAmapSecurityCode()) {
    return
  }

  target._AMapSecurityConfig = {
    ...(target._AMapSecurityConfig || {}),
    securityJsCode: AMAP_SECURITY_JS_CODE,
  }
}
