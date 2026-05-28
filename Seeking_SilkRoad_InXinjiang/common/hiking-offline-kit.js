import { formatCoordinate, normalizeLocation, sumTrackDistanceKm } from './hiking-metrics'
import { formatSafetyPlanTime } from './hiking-safety-plan'

const HIKING_OFFLINE_KIT_KEY = 'meet-xinjiang-hiking-offline-kit'

export const DEFAULT_OFFLINE_CHECKLIST = [
  { id: 'map', title: '离线底图', desc: '出发前下载当前区域瓦片包' },
  { id: 'power', title: '电量与充电宝', desc: '手机满电，充电宝和线可用' },
  { id: 'lamp', title: '头灯/手电', desc: '夜间或山谷弱光可照明' },
  { id: 'warm', title: '保暖防风层', desc: '山区入夜降温明显' },
  { id: 'water_food', title: '水和路餐', desc: '预留返程和等待救援余量' },
  { id: 'first_aid', title: '急救包', desc: '止血、消毒、常用药' },
  { id: 'route_notice', title: '路线告知', desc: '把路线和预计返程告诉联系人' },
]

export function getHikingOfflineKit() {
  try {
    const raw = uni.getStorageSync(HIKING_OFFLINE_KIT_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return normalizeKit(parsed)
  } catch (error) {
    return normalizeKit({})
  }
}

export function saveHikingOfflineKit(payload = {}) {
  const normalized = normalizeKit(payload)
  uni.setStorageSync(HIKING_OFFLINE_KIT_KEY, JSON.stringify(normalized))
  return normalized
}

export function updateOfflineKitSnapshot(snapshot = {}) {
  return saveHikingOfflineKit({
    ...getHikingOfflineKit(),
    snapshot: normalizeSnapshot(snapshot),
    updatedAt: Date.now(),
  })
}

export function toggleOfflineChecklistItem(itemId, checked) {
  const kit = getHikingOfflineKit()
  const nextChecklist = {
    ...kit.checklist,
    [String(itemId)]: Boolean(checked),
  }
  return saveHikingOfflineKit({
    ...kit,
    checklist: nextChecklist,
    updatedAt: Date.now(),
  })
}

export function buildOfflineKitSnapshot({
  location = null,
  trackPoints = [],
  safetyPlan = {},
  offlinePack = null,
  networkOnline = true,
  compassText = '',
} = {}) {
  const currentLocation = normalizeLocation(location)
  const normalizedTrackPoints = Array.isArray(trackPoints)
    ? trackPoints.map(normalizeLocation).filter(Boolean)
    : []
  const lastTrackPoint = normalizedTrackPoints[normalizedTrackPoints.length - 1] || null
  const firstTrackPoint = normalizedTrackPoints[0] || null
  const snapshotLocation = currentLocation || lastTrackPoint

  return normalizeSnapshot({
    updatedAt: Date.now(),
    location: snapshotLocation,
    track: {
      pointCount: normalizedTrackPoints.length,
      distanceKm: sumTrackDistanceKm(normalizedTrackPoints),
      startedAt: Number(firstTrackPoint?.timestamp || 0),
      lastPointAt: Number(lastTrackPoint?.timestamp || 0),
    },
    safetyPlan: normalizeSafetyPlan(safetyPlan),
    offlinePack: normalizeOfflinePack(offlinePack),
    networkOnline: Boolean(networkOnline),
    compassText: String(compassText || ''),
  })
}

export function evaluateOfflineKitReadiness(kit = getHikingOfflineKit()) {
  const normalized = normalizeKit(kit)
  const snapshot = normalized.snapshot
  const checklistDone = DEFAULT_OFFLINE_CHECKLIST.filter((item) => normalized.checklist[item.id]).length
  const checks = [
    {
      id: 'gps',
      title: 'GPS 快照',
      ready: Boolean(snapshot.location),
      desc: snapshot.location ? '已保存最近坐标' : '还没有可用定位',
    },
    {
      id: 'map',
      title: '离线底图',
      ready: snapshot.offlinePack.status === 'ready',
      desc: snapshot.offlinePack.status === 'ready' ? '断网可看底图' : '建议出发前下载',
    },
    {
      id: 'contact',
      title: '紧急联系人',
      ready: Boolean(snapshot.safetyPlan.primaryPhone),
      desc: snapshot.safetyPlan.primaryPhone ? '已保存联系人电话' : '请填写安全报备',
    },
    {
      id: 'route',
      title: '路线信息',
      ready: Boolean(snapshot.safetyPlan.routeNote || snapshot.track.pointCount),
      desc: snapshot.safetyPlan.routeNote ? '已保存报备路线' : '可用轨迹点辅助判断',
    },
    {
      id: 'checklist',
      title: '出发检查',
      ready: checklistDone >= DEFAULT_OFFLINE_CHECKLIST.length,
      desc: `${checklistDone}/${DEFAULT_OFFLINE_CHECKLIST.length} 项已确认`,
    },
  ]
  const readyCount = checks.filter((item) => item.ready).length

  return {
    checks,
    readyCount,
    totalCount: checks.length,
    checklistDone,
    checklistTotal: DEFAULT_OFFLINE_CHECKLIST.length,
    allReady: readyCount === checks.length,
  }
}

export function buildOfflineEmergencyCard(kit = getHikingOfflineKit()) {
  const normalized = normalizeKit(kit)
  const snapshot = normalized.snapshot
  const location = snapshot.location
  const safetyPlan = snapshot.safetyPlan
  const track = snapshot.track
  const pack = snapshot.offlinePack
  const checklistDone = DEFAULT_OFFLINE_CHECKLIST
    .filter((item) => normalized.checklist[item.id])
    .map((item) => item.title)

  const locationLines = location
    ? [
        `最近坐标：${formatCoordinate(location.latitude, 'lat')}, ${formatCoordinate(location.longitude, 'lng')}`,
        `海拔：${formatMetricValue(location.altitude, 'm')}`,
        `定位精度：${formatMetricValue(location.accuracy, 'm')}`,
        `高德链接：https://uri.amap.com/marker?position=${location.longitude},${location.latitude}&name=徒步最近位置`,
      ]
    : ['最近坐标：暂无，请根据报备路线和最后联系时间判断。']

  const contactLines = safetyPlan.primaryPhone
    ? [
        `联系人：${safetyPlan.contactName || '未命名'} ${safetyPlan.primaryPhone}`,
        safetyPlan.backupPhone ? `备用电话：${safetyPlan.backupPhone}` : '',
      ].filter(Boolean)
    : ['联系人：未配置']

  const planLines = [
    safetyPlan.routeNote ? `报备路线：${safetyPlan.routeNote}` : '',
    safetyPlan.expectedReturnAt ? `预计返程：${formatSafetyPlanTime(safetyPlan.expectedReturnAt)}` : '',
    safetyPlan.active ? '报备状态：进行中' : '报备状态：未启用或已结束',
  ].filter(Boolean)

  return [
    '【丝路疆寻徒步离线安全卡】',
    `更新时间：${formatOfflineKitTime(snapshot.updatedAt || normalized.updatedAt)}`,
    ...locationLines,
    ...contactLines,
    ...planLines,
    `轨迹摘要：${track.pointCount} 个点，约 ${Number(track.distanceKm || 0).toFixed(2)} km`,
    `离线底图：${pack.status === 'ready' ? '已准备' : '未准备'}${pack.name ? `，${pack.name}` : ''}`,
    `已确认装备：${checklistDone.length ? checklistDone.join('、') : '暂无'}`,
    '断网提示：优先原路返回到已知轨迹，保存电量，必要时使用 SOS 短信或手电闪烁。',
  ].join('\n')
}

export function formatOfflineKitTime(timestamp) {
  const date = new Date(Number(timestamp || 0))
  if (!Number.isFinite(date.getTime())) {
    return '未保存'
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function normalizeKit(payload = {}) {
  const checklist = {}
  DEFAULT_OFFLINE_CHECKLIST.forEach((item) => {
    checklist[item.id] = Boolean(payload?.checklist?.[item.id])
  })

  return {
    checklist,
    snapshot: normalizeSnapshot(payload.snapshot || {}),
    updatedAt: Number(payload.updatedAt || payload.snapshot?.updatedAt || 0) || 0,
  }
}

function normalizeSnapshot(snapshot = {}) {
  return {
    updatedAt: Number(snapshot.updatedAt || 0) || 0,
    location: normalizeLocation(snapshot.location),
    track: normalizeTrack(snapshot.track),
    safetyPlan: normalizeSafetyPlan(snapshot.safetyPlan),
    offlinePack: normalizeOfflinePack(snapshot.offlinePack),
    networkOnline: Boolean(snapshot.networkOnline),
    compassText: String(snapshot.compassText || ''),
  }
}

function normalizeTrack(track = {}) {
  return {
    pointCount: Math.max(0, Number(track.pointCount || 0) || 0),
    distanceKm: Math.max(0, Number(track.distanceKm || 0) || 0),
    startedAt: Number(track.startedAt || 0) || 0,
    lastPointAt: Number(track.lastPointAt || 0) || 0,
  }
}

function normalizeSafetyPlan(plan = {}) {
  return {
    active: Boolean(plan.active),
    contactName: String(plan.contactName || '').trim().slice(0, 40),
    primaryPhone: String(plan.primaryPhone || '').trim().slice(0, 24),
    backupPhone: String(plan.backupPhone || '').trim().slice(0, 24),
    routeNote: String(plan.routeNote || '').trim().slice(0, 100),
    expectedReturnAt: Number(plan.expectedReturnAt || 0) || 0,
  }
}

function normalizeOfflinePack(pack = {}) {
  return {
    status: String(pack?.status || '').trim(),
    name: String(pack?.name || '').trim(),
    sizeBytes: Number(pack?.sizeBytes || 0) || 0,
    totalTiles: Number(pack?.totalTiles || 0) || 0,
    updatedAt: Number(pack?.updatedAt || 0) || 0,
  }
}

function formatMetricValue(value, unit) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return '未知'
  }
  return `${Math.round(number)}${unit}`
}
