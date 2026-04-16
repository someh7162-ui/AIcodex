export const AI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const AI_MODEL = 'qwen3.6-plus'
export const AI_API_KEY = ''
export const AI_API_KEY_PLACEHOLDER = '请在本地保存百炼API Key'
export const AI_API_KEY_STORAGE = 'meet-xinjiang-ai-api-key'
export const AI_MESSAGE_STORAGE = 'meet-xinjiang-ai-messages'

export function hasBundledAiKey() {
  return Boolean(AI_API_KEY) && AI_API_KEY !== AI_API_KEY_PLACEHOLDER
}

export function getAiApiKey() {
  if (hasBundledAiKey()) {
    return AI_API_KEY
  }

  const value = uni.getStorageSync(AI_API_KEY_STORAGE)
  return typeof value === 'string' ? value.trim() : ''
}

export function hasAiApiKey() {
  return Boolean(getAiApiKey())
}

export function saveAiApiKey(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''

  if (!trimmed) {
    uni.removeStorageSync(AI_API_KEY_STORAGE)
    return ''
  }

  uni.setStorageSync(AI_API_KEY_STORAGE, trimmed)
  return trimmed
}

export function clearAiMessages() {
  uni.removeStorageSync(AI_MESSAGE_STORAGE)
}
