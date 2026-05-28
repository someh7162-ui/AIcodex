const HIKING_SAFETY_PLAN_KEY = 'meet-xinjiang-hiking-safety-plan'
const DEFAULT_DURATION_MINUTES = 120
const MIN_DURATION_MINUTES = 30
const MAX_DURATION_MINUTES = 24 * 60

export function getHikingSafetyPlan() {
  const raw = uni.getStorageSync(HIKING_SAFETY_PLAN_KEY)
  if (!raw) {
    return buildEmptyPlan()
  }

  try {
    return normalizePlan(JSON.parse(raw))
  } catch (error) {
    return buildEmptyPlan()
  }
}

export function activateHikingSafetyPlan(payload = {}, now = Date.now()) {
  const contactName = normalizeText(payload.contactName)
  const primaryPhone = normalizePhone(payload.primaryPhone)
  const backupPhone = normalizePhone(payload.backupPhone)
  const routeNote = normalizeText(payload.routeNote)
  const durationMinutes = normalizeDuration(payload.durationMinutes)

  if (!contactName) {
    throw new Error('请填写紧急联系人姓名')
  }

  if (!primaryPhone) {
    throw new Error('请填写紧急联系人电话')
  }

  const startedAt = Number(now) || Date.now()
  return savePlan({
    active: true,
    contactName,
    primaryPhone,
    backupPhone,
    routeNote,
    durationMinutes,
    startedAt,
    expectedReturnAt: startedAt + durationMinutes * 60000,
    lastConfirmedAt: startedAt,
    completedAt: 0,
    updatedAt: startedAt,
  })
}

export function completeHikingSafetyPlan(plan, now = Date.now()) {
  const currentTime = Number(now) || Date.now()
  return savePlan({
    ...normalizePlan(plan),
    active: false,
    completedAt: currentTime,
    lastConfirmedAt: currentTime,
    updatedAt: currentTime,
  })
}

export function evaluateHikingSafetyPlan(plan, now = Date.now()) {
  const normalized = normalizePlan(plan)
  const configured = Boolean(normalized.primaryPhone)

  if (!configured) {
    return {
      configured: false,
      active: false,
      level: 'idle',
      statusText: '',
      remainingMinutes: null,
      overdueMinutes: 0,
    }
  }

  if (!normalized.active || !normalized.expectedReturnAt) {
    return {
      configured: true,
      active: false,
      level: 'ready',
      statusText: '联系人已配置，可启用安全报备',
      remainingMinutes: null,
      overdueMinutes: 0,
    }
  }

  const currentTime = Number(now) || Date.now()
  const remainingMinutes = Math.ceil((normalized.expectedReturnAt - currentTime) / 60000)
  if (remainingMinutes <= 0) {
    const overdueMinutes = Math.max(1, Math.abs(remainingMinutes))
    return {
      configured: true,
      active: true,
      level: 'danger',
      statusText: `已超预计返程 ${overdueMinutes} 分钟，请报平安或求助`,
      remainingMinutes,
      overdueMinutes,
    }
  }

  if (remainingMinutes <= 30) {
    return {
      configured: true,
      active: true,
      level: 'warning',
      statusText: `距预计返程 ${remainingMinutes} 分钟`,
      remainingMinutes,
      overdueMinutes: 0,
    }
  }

  return {
    configured: true,
    active: true,
    level: 'safe',
    statusText: `预计 ${formatSafetyPlanTime(normalized.expectedReturnAt)} 前返程`,
    remainingMinutes,
    overdueMinutes: 0,
  }
}

export function formatSafetyPlanTime(timestamp) {
  const date = new Date(Number(timestamp || 0))
  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function savePlan(plan) {
  const normalized = normalizePlan(plan)
  uni.setStorageSync(HIKING_SAFETY_PLAN_KEY, JSON.stringify(normalized))
  return normalized
}

function normalizePlan(plan = {}) {
  const startedAt = Number(plan.startedAt || 0)
  const expectedReturnAt = Number(plan.expectedReturnAt || 0)
  const lastConfirmedAt = Number(plan.lastConfirmedAt || 0)
  const completedAt = Number(plan.completedAt || 0)

  return {
    active: Boolean(plan.active && expectedReturnAt),
    contactName: normalizeText(plan.contactName),
    primaryPhone: normalizePhone(plan.primaryPhone),
    backupPhone: normalizePhone(plan.backupPhone),
    routeNote: normalizeText(plan.routeNote),
    durationMinutes: normalizeDuration(plan.durationMinutes),
    startedAt: Number.isFinite(startedAt) ? startedAt : 0,
    expectedReturnAt: Number.isFinite(expectedReturnAt) ? expectedReturnAt : 0,
    lastConfirmedAt: Number.isFinite(lastConfirmedAt) ? lastConfirmedAt : 0,
    completedAt: Number.isFinite(completedAt) ? completedAt : 0,
    updatedAt: Number(plan.updatedAt || 0) || 0,
  }
}

function buildEmptyPlan() {
  return normalizePlan({ durationMinutes: DEFAULT_DURATION_MINUTES })
}

function normalizeText(value) {
  return String(value || '').trim().slice(0, 80)
}

function normalizePhone(value) {
  return String(value || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, 24)
}

function normalizeDuration(value) {
  const minutes = Number(value || DEFAULT_DURATION_MINUTES)
  if (!Number.isFinite(minutes)) {
    return DEFAULT_DURATION_MINUTES
  }
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(minutes)))
}
