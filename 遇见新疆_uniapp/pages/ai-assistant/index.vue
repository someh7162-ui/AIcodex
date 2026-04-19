<template>
  <view class="page-shell assistant-page">
    <view class="page-scroll">
      <view class="hero-gradient assistant-banner">
        <view class="hero-inner section">
          <view class="hero-copy">
            <view class="assistant-hero-row">
              <image class="assistant-avatar hero-avatar" :src="assistantAvatar" mode="aspectFill"></image>
              <view class="assistant-hero-text">
                <text class="banner-title">灵鹿</text>
                <text class="banner-subtitle">像聊天软件一样和你的新疆旅行搭子随时对话</text>
              </view>
            </view>
          </view>

          <view class="hero-status">
            <text class="status-dot" :class="{ ready: hasApiKey }"></text>
            <text class="hero-status-text">{{ hasApiKey ? '连接已就绪' : '内部配置未填写' }}</text>
          </view>
        </view>
      </view>

      <view v-if="incomingContextTitle" class="section context-shell">
        <view class="context-card card">
          <view class="context-head">
            <text class="section-title">当前接入上下文</text>
            <text class="context-source muted-text">{{ incomingContextSource }}</text>
          </view>
          <text class="context-title">{{ incomingContextTitle }}</text>
          <text v-if="incomingContextDesc" class="context-desc muted-text">{{ incomingContextDesc }}</text>
          <view class="context-actions">
            <view class="primary-action" @tap="sendIncomingPrompt">让 AI 生成建议</view>
            <view class="secondary-action" @tap="fillIncomingPrompt">填入输入框</view>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="section-head">
          <text class="section-title">快捷问题</text>
          <text class="link-text" @tap="clearConversation">清空会话</text>
        </view>

        <view class="shortcut-list">
          <view
            v-for="item in presetQuestions"
            :key="item"
            class="shortcut-pill"
            @tap="sendPresetQuestion(item)"
          >
            <text>{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="section section-block">
        <view class="dialogue-head">
          <view class="dialogue-state" :class="{ active: sending }">
            <text class="dialogue-state-dot"></text>
            <text>{{ dialogueStateText }}</text>
          </view>
        </view>

        <view v-if="errorMessage" class="error-banner">
          <text>{{ errorMessage }}</text>
        </view>

        <view class="dialogue-surface">
          <view v-if="!messages.length" class="empty-card">
            <view class="message-row assistant intro-row">
              <image class="message-avatar assistant-avatar bubble-avatar" :src="assistantAvatar" mode="aspectFill"></image>
              <view class="message-bubble assistant-bubble intro-bubble">
                <text class="message-role">灵鹿</text>
                <text class="message-content intro-content">HI！我是灵鹿，有关于西域旅游的问题都可以问我哦！</text>
              </view>
            </view>
          </view>

          <view v-else class="message-list">
            <view
              v-for="item in messages"
              :key="item.id"
              class="message-row"
              :class="{ mine: item.role === 'user', assistant: item.role === 'assistant' }"
            >
              <image v-if="item.role === 'assistant'" class="message-avatar assistant-avatar bubble-avatar" :src="assistantAvatar" mode="aspectFill"></image>
              <view class="message-bubble" :class="item.role === 'user' ? 'user-bubble' : 'assistant-bubble'">
                <text class="message-role">{{ item.role === 'user' ? '我' : '灵鹿' }}</text>
                <text v-if="item.role === 'user'" class="message-content user-content">{{ item.content }}</text>
                <view v-else-if="isAssistantStreaming(item)" class="assistant-streaming">
                  <view v-if="getRenderableMessageContent(item)" class="streaming-content">
                    <text class="message-content assistant-content plain-content">{{ getRenderableMessageContent(item) }}</text>
                    <text class="stream-cursor">▍</text>
                  </view>
                  <view v-else class="streaming-waiting">
                    <text class="waiting-text">灵鹿正在整理回答</text>
                    <view class="waiting-dots">
                      <text class="waiting-dot"></text>
                      <text class="waiting-dot"></text>
                      <text class="waiting-dot"></text>
                    </view>
                  </view>
                </view>
                <view v-else class="assistant-markdown">
                  <block v-for="(block, blockIndex) in getMessageBlocks(item)" :key="`${item.id}-${blockIndex}`">
                    <text
                      v-if="block.type === 'heading'"
                      class="markdown-heading"
                      :class="`level-${block.level}`"
                    >
                      <text
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="segmentIndex"
                        :class="{ strong: segment.strong }"
                      >{{ segment.text }}</text>
                    </text>

                    <view v-else-if="block.type === 'list'" class="markdown-list">
                      <view
                        v-for="(listItem, listIndex) in block.items"
                        :key="listIndex"
                        class="markdown-list-row"
                      >
                        <text class="markdown-marker">
                          {{ block.ordered ? `${listIndex + 1}.` : '•' }}
                        </text>
                        <view class="markdown-list-content">
                          <text
                            v-for="(segment, segmentIndex) in listItem.segments"
                            :key="segmentIndex"
                            :class="{ strong: segment.strong }"
                          >{{ segment.text }}</text>
                        </view>
                      </view>
                    </view>

                    <view v-else-if="block.type === 'note'" class="markdown-note">
                      <text
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="segmentIndex"
                        :class="{ strong: segment.strong }"
                      >{{ segment.text }}</text>
                    </view>

                    <text v-else class="markdown-paragraph">
                      <text
                        v-for="(segment, segmentIndex) in block.segments"
                        :key="segmentIndex"
                        :class="{ strong: segment.strong }"
                      >{{ segment.text }}</text>
                    </text>
                  </block>
                </view>
              </view>
              <image
                v-if="item.role === 'user'"
                class="message-avatar user-avatar bubble-avatar"
                :src="userAvatar"
                mode="aspectFill"
              ></image>
            </view>
          </view>

          <view v-if="awaitingReply && !hasStreamingAssistant" class="typing-row">
            <image class="message-avatar assistant-avatar bubble-avatar" :src="assistantAvatar" mode="aspectFill"></image>
            <view class="typing-card">
              <text class="typing-text">灵鹿正在整理建议...</text>
            </view>
          </view>

          <view id="ai-response-anchor" class="response-anchor"></view>
        </view>
      </view>

      <view class="composer-space"></view>
      <view class="bottom-space"></view>
    </view>

    <view class="composer-wrap">
      <view class="composer-bar">
        <view class="composer-input-shell">
          <textarea
            v-model="draft"
            class="composer-input"
            auto-height
            maxlength="800"
            placeholder="输入你想问灵鹿的问题，例如：新疆 7 天怎么安排？"
          />
          <view class="composer-foot">
            <view class="composer-status-pill" :class="{ offline: !hasApiKey }">
              <text class="composer-status-dot"></text>
              <text class="composer-hint">{{ hasApiKey ? '灵鹿在线' : '等待配置 Key' }}</text>
            </view>
            <view class="send-btn" :class="{ disabled: !canSend }" @tap="sendDraft">发送</view>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStoredAuthUser } from '../../common/auth-storage'
import { AI_MESSAGE_STORAGE, clearAiMessages, getAiApiKey } from '../../config/ai'
import {
  chatWithTravelAssistant,
  getTravelAssistantPresetQuestions,
} from '../../services/ai'

const presetQuestions = getTravelAssistantPresetQuestions()
const savedApiKey = ref(getAiApiKey())
const draft = ref('')
const awaitingReply = ref(false)
const revealingReply = ref(false)
const errorMessage = ref('')
const messages = ref(loadMessages())
const incomingContextTitle = ref('')
const incomingContextDesc = ref('')
const incomingContextSource = ref('景区页')
const incomingPrompt = ref('')
const incomingContext = ref('')
let responseRevealTimer = null
let scrollTimer = null
const assistantAvatar = '/static/ai/linglu-avatar.jpg'
const currentUser = computed(() => getStoredAuthUser() || null)
const userAvatar = computed(() => currentUser.value?.avatar_url || currentUser.value?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=160')

const hasApiKey = computed(() => Boolean(savedApiKey.value))
const sending = computed(() => awaitingReply.value || revealingReply.value)
const canSend = computed(() => Boolean(draft.value.trim()) && !sending.value && hasApiKey.value)
const hasStreamingAssistant = computed(() => messages.value.some((item) => item?.role === 'assistant' && item?.isStreaming))
const dialogueStateText = computed(() => {
  if (awaitingReply.value) {
    return '思考中'
  }
  if (revealingReply.value) {
    return '回复中'
  }
  return `${messages.value.length} 条记录`
})

function getMessageBlocks(item) {
  const content = getRenderableMessageContent(item)
  if (!content) {
    return []
  }

  return parseAssistantMarkdown(content)
}

function getRenderableMessageContent(item) {
  if (!item) {
    return ''
  }

  if (item.role === 'assistant') {
    return item.displayContent ?? item.content ?? ''
  }

  return item.content || ''
}

function isAssistantStreaming(item) {
  return Boolean(item?.role === 'assistant' && item?.isStreaming)
}

function parseAssistantMarkdown(content) {
  const lines = String(content)
    .replace(/\r\n/g, '\n')
    .split('\n')

  const blocks = []
  let paragraphLines = []
  let currentList = null

  function flushParagraph() {
    if (!paragraphLines.length) {
      return
    }

    blocks.push({
      type: 'paragraph',
      segments: formatInlineMarkdown(paragraphLines.join('\n')),
    })
    paragraphLines = []
  }

  function flushList() {
    if (!currentList) {
      return
    }

    blocks.push(currentList)
    currentList = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: Math.min(headingMatch[1].length, 3),
        segments: formatInlineMarkdown(headingMatch[2]),
      })
      return
    }

    const noteMatch = trimmed.match(/^>\s+(.+)$/)
    if (noteMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'note',
        segments: formatInlineMarkdown(noteMatch[1]),
      })
      return
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch)
      const text = orderedMatch?.[1] || unorderedMatch?.[1] || ''
      flushParagraph()

      if (!currentList || currentList.ordered !== ordered) {
        flushList()
        currentList = {
          type: 'list',
          ordered,
          items: [],
        }
      }

      currentList.items.push({
        segments: formatInlineMarkdown(text),
      })
      return
    }

    flushList()
    paragraphLines.push(trimmed)
  })

  flushParagraph()
  flushList()

  if (!blocks.length) {
    return [{ type: 'paragraph', segments: formatInlineMarkdown(content) }]
  }

  return blocks
}

function formatInlineMarkdown(text) {
  const segments = []
  const source = String(text).replace(/`([^`]+)`/g, '$1')
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(source))) {
    if (match.index > lastIndex) {
      segments.push({
        text: source.slice(lastIndex, match.index),
        strong: false,
      })
    }

    segments.push({
      text: match[2] || match[3] || '',
      strong: true,
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < source.length) {
    segments.push({
      text: source.slice(lastIndex),
      strong: false,
    })
  }

  return segments.length ? segments : [{ text: source, strong: false }]
}

onLoad(async (options) => {
  incomingContextTitle.value = decodeParam(options?.title)
  incomingContextDesc.value = decodeParam(options?.desc)
  incomingContextSource.value = decodeParam(options?.source) || '景区页'
  incomingPrompt.value = decodeParam(options?.prompt)
  incomingContext.value = decodeParam(options?.context)

  if (incomingPrompt.value && !draft.value) {
    draft.value = incomingPrompt.value
  }

  if (options?.autoAsk === '1' && incomingPrompt.value && hasApiKey.value) {
    await sendQuestion(incomingPrompt.value, incomingContext.value)
    draft.value = ''
  }
})

function decodeParam(value) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch (error) {
    return String(value)
  }
}

function loadMessages() {
  try {
    const stored = uni.getStorageSync(AI_MESSAGE_STORAGE)
    const parsed = JSON.parse(stored || '[]')
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          displayContent: item?.role === 'assistant' ? (item.displayContent || item.content || '') : undefined,
        }))
      : []
  } catch (error) {
    return []
  }
}

function persistMessages() {
  uni.setStorageSync(AI_MESSAGE_STORAGE, JSON.stringify(messages.value
    .filter((item) => item?.role !== 'assistant' || item?.content)
    .map((item) => {
      if (item?.role === 'assistant') {
        return {
          ...item,
          displayContent: undefined,
          isStreaming: false,
        }
      }

      return item
    })))
}

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  }
}

function clearConversation() {
  stopResponseReveal()
  uni.showModal({
    title: '清空会话',
    content: '确认清空当前 AI 对话记录吗？清空后无法恢复。',
    confirmText: '确认清空',
    cancelText: '取消',
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      messages.value = []
      clearAiMessages()
      errorMessage.value = ''
      uni.showToast({
        title: '会话已清空',
        icon: 'none',
      })
    },
  })
}

async function sendQuestion(question, extraContext = '') {
  const content = question.trim()

  if (!content || sending.value) {
    return
  }

  if (!hasApiKey.value) {
    errorMessage.value = '请先保存百炼 API Key，再开始提问。'
    return
  }

  errorMessage.value = ''
  stopResponseReveal()
  const userMessage = createMessage('user', content)
  const assistantMessage = {
    ...createMessage('assistant', ''),
    displayContent: '',
    isStreaming: true,
  }
  const nextMessages = [...messages.value, userMessage, assistantMessage]
  messages.value = nextMessages
  persistMessages()
  awaitingReply.value = true
  await scrollToConversationBottom()

  try {
    const answer = await chatWithTravelAssistant(nextMessages, extraContext)
    assistantMessage.content = answer
    awaitingReply.value = false
    await revealAssistantMessage(assistantMessage.id, answer)
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== assistantMessage.id)
    persistMessages()
    errorMessage.value = error.message || 'AI 响应失败，请稍后再试。'
    uni.showToast({
      title: errorMessage.value,
      icon: 'none',
      duration: 2500,
    })
  } finally {
    awaitingReply.value = false
    revealingReply.value = false
  }
}

async function revealAssistantMessage(messageId, fullText) {
  const text = String(fullText || '')
  const chunks = buildRevealChunks(text)
  let cursor = 0
  let scrollTick = 0
  revealingReply.value = true

  return new Promise((resolve) => {
    const step = async () => {
      const target = messages.value.find((item) => item.id === messageId)
      if (!target) {
        stopResponseReveal()
        resolve()
        return
      }

      target.displayContent += chunks[cursor] || ''
      messages.value = [...messages.value]
      scrollTick += 1
      if (scrollTick === 1 || scrollTick % 2 === 0 || cursor >= chunks.length - 1) {
        await scrollToConversationBottom(120)
      }

      if (cursor >= chunks.length - 1) {
        target.displayContent = text
        target.isStreaming = false
        messages.value = [...messages.value]
        persistMessages()
        revealingReply.value = false
        stopResponseReveal()
        resolve()
        return
      }

      cursor += 1
      responseRevealTimer = setTimeout(step, getRevealDelay(chunks[cursor]))
    }

    step()
  })
}

function buildRevealChunks(text) {
  const source = String(text || '')
  const lines = source.match(/.*?(?:\n|$)/g)?.filter(Boolean) || []
  const chunks = []

  lines.forEach((line) => {
    const parts = line.match(/[^。！？!?\n]+[。！？!?]?|\n/g) || [line]
    parts.forEach((part) => {
      if (!part) {
        return
      }

      if (part === '\n') {
        chunks.push(part)
        return
      }

      if (part.length <= 24) {
        chunks.push(part)
        return
      }

      for (let index = 0; index < part.length; index += 18) {
        chunks.push(part.slice(index, index + 18))
      }
    })
  })

  return chunks.length ? chunks : [source]
}

function getRevealDelay(chunk) {
  const text = String(chunk || '')
  if (/^[\n]+$/.test(text)) {
    return 90
  }
  if (/[。！？!?]$/.test(text.trim())) {
    return 120
  }
  if (text.length >= 16) {
    return 55
  }
  return 35
}

function stopResponseReveal() {
  if (responseRevealTimer) {
    clearTimeout(responseRevealTimer)
    responseRevealTimer = null
  }
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
  revealingReply.value = false
}

async function scrollToConversationBottom(duration = 280) {
  await nextTick()

  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }

  scrollTimer = setTimeout(() => {
    uni.pageScrollTo({
      selector: '#ai-response-anchor',
      duration,
    })
    scrollTimer = null
  }, 80)
}

function sendDraft() {
  const content = draft.value.trim()

  if (!content || sending.value) {
    return
  }

  if (!hasApiKey.value) {
    errorMessage.value = '请先保存百炼 API Key，再开始提问。'
    return
  }

  draft.value = ''
  sendQuestion(content, incomingContext.value)
}

function sendPresetQuestion(question) {
  if (sending.value) {
    return
  }

  draft.value = ''
  sendQuestion(question, incomingContext.value)
}

function fillIncomingPrompt() {
  if (!incomingPrompt.value) {
    return
  }

  draft.value = incomingPrompt.value
}

function sendIncomingPrompt() {
  if (!incomingPrompt.value || sending.value) {
    return
  }

  draft.value = ''
  sendQuestion(incomingPrompt.value, incomingContext.value)
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.assistant-page {
  background: $theme-bg;
}

.assistant-banner {
  position: relative;
  padding-top: 52rpx;
  padding-bottom: 40rpx;
  color: #ffffff;
  overflow: hidden;
  background-image: linear-gradient(180deg, rgba(67, 36, 24, 0.28), rgba(67, 36, 24, 0.46)), url('/static/ai/linglu-background.jpg');
  background-size: cover;
  background-position: center;
}

.assistant-banner::after {
  content: '';
  position: absolute;
  right: -80rpx;
  top: 54rpx;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  filter: blur(8rpx);
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-copy {
  margin-top: 18rpx;
  max-width: 560rpx;
  width: 100%;
}

.assistant-hero-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  text-align: center;
}

.assistant-hero-text {
  width: 100%;
}

.assistant-avatar,
.user-avatar,
.bubble-avatar {
  flex-shrink: 0;
}

.user-avatar {
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12rpx 24rpx rgba(45, 24, 16, 0.1);
}

.assistant-avatar {
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 12rpx 24rpx rgba(45, 24, 16, 0.12);
  overflow: hidden;
}

.hero-avatar {
  width: 104rpx;
  height: 104rpx;
}

.bubble-avatar {
  width: 68rpx;
  height: 68rpx;
  margin-top: 8rpx;
}

.banner-title {
  display: block;
  font-size: 56rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  font-family: 'STKaiti', 'KaiTi', 'FangSong', serif;
  text-shadow: 0 6rpx 18rpx rgba(25, 13, 8, 0.28);
}

.banner-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  line-height: 1.55;
  opacity: 0.92;
}

.hero-status {
  margin-top: 18rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
}

.status-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.status-dot.ready {
  background: #d8f7d5;
}

.hero-status-text {
  font-size: 20rpx;
  opacity: 0.94;
}

.context-shell {
  margin-top: 24rpx;
}

.context-card {
  padding: 28rpx;
}

.context-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.context-source {
  font-size: 22rpx;
}

.context-title {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.context-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.context-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 22rpx;
}

.primary-action,
.secondary-action {
  flex: 1;
  min-height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.primary-action {
  background: $theme-color;
  color: #ffffff;
}

.secondary-action {
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
}

.section-block {
  margin-top: 40rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.link-text {
  color: $theme-color;
  font-size: 24rpx;
}

.shortcut-list {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.shortcut-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 2rpx solid rgba(196, 69, 54, 0.1);
  color: $theme-text;
  font-size: 20rpx;
}

.dialogue-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20rpx;
}

.dialogue-state {
  min-width: 132rpx;
  height: 56rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: rgba(255, 255, 255, 0.82);
  color: $theme-muted;
  font-size: 22rpx;
  flex-shrink: 0;
}

.dialogue-state.active {
  color: $theme-color;
  background: rgba(196, 69, 54, 0.1);
}

.dialogue-state-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: currentColor;
}

.error-banner {
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(196, 69, 54, 0.1);
  color: $theme-color;
  font-size: 24rpx;
  line-height: 1.6;
}

.dialogue-surface {
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 34rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 250, 245, 0.9));
  border: 2rpx solid rgba(196, 69, 54, 0.08);
  box-shadow: 0 24rpx 52rpx rgba(45, 24, 16, 0.07);
}

.empty-card {
  padding: 6rpx 0;
}

.intro-row {
  width: 100%;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.message-row.assistant {
  width: 100%;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 86%;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: #f7f2ec;
}

.message-row.mine .message-bubble,
.user-bubble {
  border-radius: 20rpx;
  background: $theme-color;
  color: #ffffff;
  box-shadow: 0 14rpx 28rpx rgba(196, 69, 54, 0.16);
}

.message-row.mine .message-role,
.message-row.mine .message-content,
.message-row.mine .strong {
  color: #ffffff;
}

.assistant-bubble {
  max-width: calc(100% - 84rpx);
  background: #ffffff;
  border: 2rpx solid rgba(196, 69, 54, 0.09);
  border-left: 8rpx solid rgba(196, 69, 54, 0.44);
  box-shadow: 0 16rpx 34rpx rgba(45, 24, 16, 0.05);
}

.intro-bubble {
  max-width: calc(100% - 84rpx);
}

.message-role {
  display: block;
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 0.5rpx;
  opacity: 0.68;
}

.message-content {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.6;
  white-space: pre-wrap;
}

.user-content {
  word-break: break-word;
}

.intro-content {
  color: $theme-text;
}

.assistant-markdown {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.assistant-streaming {
  margin-top: 8rpx;
}

.streaming-content {
  display: inline;
  animation: streamFadeIn 0.18s ease-out;
}

.assistant-content.plain-content {
  color: $theme-text;
}

.stream-cursor {
  margin-left: 4rpx;
  font-size: 20rpx;
  color: $theme-color;
  opacity: 0.88;
  animation: cursorBlink 0.9s steps(1) infinite;
}

.streaming-waiting {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  min-height: 44rpx;
}

.waiting-text {
  font-size: 20rpx;
  color: $theme-muted;
}

.waiting-dots {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.waiting-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(196, 69, 54, 0.6);
  animation: waitingPulse 1.1s ease-in-out infinite;
}

.waiting-dot:nth-child(2) {
  animation-delay: 0.16s;
}

.waiting-dot:nth-child(3) {
  animation-delay: 0.32s;
}

.markdown-heading {
  display: block;
  color: $theme-text;
  font-weight: 700;
  line-height: 1.45;
}

.markdown-heading.level-1 {
  font-size: 28rpx;
}

.markdown-heading.level-2 {
  font-size: 26rpx;
}

.markdown-heading.level-3 {
  font-size: 24rpx;
}

.markdown-paragraph {
  display: block;
  color: $theme-text;
  font-size: 22rpx;
  line-height: 1.62;
  word-break: break-word;
  white-space: pre-wrap;
}

.markdown-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.markdown-list-row {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
}

.markdown-marker {
  min-width: 28rpx;
  color: $theme-color;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.6;
  text-align: right;
  flex-shrink: 0;
}

.markdown-list-content {
  flex: 1;
  color: $theme-text;
  font-size: 22rpx;
  line-height: 1.62;
  word-break: break-word;
}

.markdown-note {
  padding: 12rpx 16rpx;
  border-radius: 18rpx;
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
  font-size: 20rpx;
  line-height: 1.55;
}

.strong {
  font-weight: 700;
  color: $theme-text;
}

.typing-row {
  margin-top: 18rpx;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.typing-card {
  padding: 12rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.14);
}

.typing-text {
  font-size: 19rpx;
  color: $theme-muted;
}

@keyframes waitingPulse {
  0%,
  80%,
  100% {
    transform: translateY(0) scale(0.82);
    opacity: 0.36;
  }

  40% {
    transform: translateY(-4rpx) scale(1);
    opacity: 1;
  }
}

@keyframes cursorBlink {
  0%,
  49% {
    opacity: 0.92;
  }

  50%,
  100% {
    opacity: 0.08;
  }
}

@keyframes streamFadeIn {
  from {
    opacity: 0.7;
  }

  to {
    opacity: 1;
  }
}

.response-anchor {
  width: 100%;
  height: 2rpx;
}

.composer-space {
  height: 240rpx;
}

.composer-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 18;
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(250, 248, 245, 0.96);
  border-top: 2rpx solid rgba(196, 69, 54, 0.08);
  backdrop-filter: blur(18rpx);
}

.composer-bar {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.composer-input-shell {
  flex: 1;
  min-width: 0;
  padding: 14rpx 16rpx 14rpx 20rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18rpx 40rpx rgba(45, 24, 16, 0.1);
}

.composer-input {
  width: 100%;
  min-height: 84rpx;
  max-height: 220rpx;
  padding: 16rpx 14rpx;
  border-radius: 22rpx;
  background: #f7f1eb;
  font-size: 26rpx;
  line-height: 1.6;
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 12rpx;
}

.composer-status-pill {
  margin-right: auto;
  height: 54rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(47, 125, 75, 0.08);
  color: #2f7d4b;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
}

.composer-status-pill.offline {
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
}

.composer-status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: currentColor;
}

.composer-hint {
  font-size: 22rpx;
}

.send-btn {
  min-width: 120rpx;
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 18rpx;
  background: $theme-color;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.send-btn.disabled {
  opacity: 0.45;
}

@media screen and (max-width: 720rpx) {
  .assistant-hero-row {
    gap: 14rpx;
  }

  .dialogue-head {
    align-items: flex-start;
  }

  .composer-foot {
    flex-wrap: wrap;
  }

  .composer-status-pill {
    order: 3;
    margin-right: 0;
  }
}
</style>
