export const AI_MESSAGE_STORAGE = 'meet-xinjiang-ai-messages'

export function clearAiMessages() {
  uni.removeStorageSync(AI_MESSAGE_STORAGE)
}
