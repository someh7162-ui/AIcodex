<template>
  <view class="page-shell assistant-page">
    <view class="page-scroll">
      <view class="hero-gradient assistant-banner">
        <view class="hero-inner section">
          <view class="private-tools">
            <input v-model="apiKeyInput" password class="mini-key-input" />
            <view class="mini-action" @tap="saveApiKeyToStorage">存</view>
            <view class="mini-action dark" :class="{ disabled: testing }" @tap="runConnectionTest">
              {{ testing ? '...' : '测' }}
            </view>
          </view>

          <view class="hero-copy">
            <text class="hero-kicker">Meet Xinjiang AI</text>
            <text class="banner-title">AI 旅游助手</text>
            <text class="banner-subtitle">面向新疆旅行场景的问答与行程建议</text>
          </view>

          <view class="hero-meta">
            <view class="meta-item">
              <text class="meta-label">定位</text>
              <text class="meta-value">目的地推荐</text>
            </view>
            <view class="meta-divider"></view>
            <view class="meta-item">
              <text class="meta-label">能力</text>
              <text class="meta-value">行程规划</text>
            </view>
            <view class="meta-divider"></view>
            <view class="meta-item">
              <text class="meta-label">风格</text>
              <text class="meta-value">简洁实用</text>
            </view>
          </view>

          <view class="hero-status">
            <text class="status-dot" :class="{ ready: hasApiKey }"></text>
            <text class="hero-status-text">{{ hasApiKey ? '连接已就绪' : '内部配置未填写' }}</text>
          </view>
        </view>
      </view>

      <view class="section capability-shell">
        <view class="capability-grid">
          <view class="capability-item">
            <text class="capability-name">行程规划</text>
            <text class="capability-desc">按天数给出新疆旅行安排</text>
          </view>
          <view class="capability-item">
            <text class="capability-name">目的地选择</text>
            <text class="capability-desc">结合景点资料给路线建议</text>
          </view>
          <view class="capability-item">
            <text class="capability-name">出行提醒</text>
            <text class="capability-desc">装备、预算与季节建议</text>
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

      <view v-if="testResult" class="section test-shell">
        <view class="test-card" :class="{ failed: !testResult.ok }">
          <text class="test-title">{{ testResult.ok ? '连接测试成功' : '连接测试失败' }}</text>
          <text class="test-desc">{{ testResult.message }}</text>
          <text v-if="testResult.meta" class="test-meta muted-text">{{ testResult.meta }}</text>
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
          <view>
            <text class="section-title">智能顾问工作台</text>
            <text class="dialogue-note muted-text">结构化输出新疆旅行建议</text>
          </view>
          <view class="dialogue-state" :class="{ active: sending }">
            <text class="dialogue-state-dot"></text>
            <text>{{ sending ? '生成中' : `${messages.length} 条记录` }}</text>
          </view>
        </view>

        <view v-if="errorMessage" class="error-banner">
          <text>{{ errorMessage }}</text>
        </view>

        <view class="dialogue-surface">
          <view v-if="!messages.length" class="empty-card">
            <text class="empty-title">从一个具体问题开始</text>
            <text class="empty-desc muted-text">
              例如新疆第一次去怎么玩、喀纳斯安排几天、乌鲁木齐夜游吃什么。
            </text>
          </view>

          <view v-else class="message-list">
            <view
              v-for="item in messages"
              :key="item.id"
              class="message-row"
              :class="{ mine: item.role === 'user', assistant: item.role === 'assistant' }"
            >
              <view class="message-bubble" :class="{ 'assistant-bubble': item.role === 'assistant' }">
                <text class="message-role">{{ item.role === 'user' ? '用户' : 'AI助手' }}</text>
                <text v-if="item.role === 'user'" class="message-content user-content">{{ item.content }}</text>
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
            </view>
          </view>

          <view v-if="sending" class="typing-row">
            <view class="typing-card">
              <text class="typing-text">AI 正在整理建议...</text>
            </view>
          </view>
        </view>
      </view>

      <view class="composer-space"></view>
      <view class="bottom-space"></view>
    </view>

    <view class="composer-wrap">
      <view class="composer card">
        <textarea
          v-model="draft"
          class="composer-input"
          auto-height
          maxlength="800"
          placeholder="输入你的旅行问题，例如：新疆 7 天怎么安排？"
        />
        <view class="composer-foot">
          <text class="muted-text composer-hint">{{ hasApiKey ? '已连接 AI 旅游助手' : '请先填写内部 Key' }}</text>
          <view class="send-btn" :class="{ disabled: !canSend }" @tap="sendDraft">发送</view>
        </view>
      </view>
    </view>

    <AppTabBar current="/pages/ai-assistant/index" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppTabBar from '../../components/AppTabBar.vue'
import { AI_MESSAGE_STORAGE, clearAiMessages, getAiApiKey, saveAiApiKey } from '../../config/ai'
import {
  chatWithTravelAssistant,
  getTravelAssistantPresetQuestions,
  testTravelAssistantConnection,
} from '../../services/ai'

const presetQuestions = getTravelAssistantPresetQuestions()
const savedApiKey = ref(getAiApiKey())
const apiKeyInput = ref(savedApiKey.value)
const draft = ref('')
const sending = ref(false)
const testing = ref(false)
const errorMessage = ref('')
const testResult = ref(null)
const messages = ref(loadMessages())
const incomingContextTitle = ref('')
const incomingContextDesc = ref('')
const incomingContextSource = ref('景区页')
const incomingPrompt = ref('')
const incomingContext = ref('')

const hasApiKey = computed(() => Boolean(savedApiKey.value))
const canSend = computed(() => Boolean(draft.value.trim()) && !sending.value && hasApiKey.value)

function getMessageBlocks(item) {
  if (!item?.content) {
    return []
  }

  return parseAssistantMarkdown(item.content)
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
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function persistMessages() {
  uni.setStorageSync(AI_MESSAGE_STORAGE, JSON.stringify(messages.value))
}

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
  }
}

function saveApiKeyToStorage() {
  const value = saveAiApiKey(apiKeyInput.value)
  savedApiKey.value = value
  apiKeyInput.value = value
  errorMessage.value = ''
  testResult.value = null
  uni.showToast({
    title: value ? '已保存到本机' : '已清除本地 Key',
    icon: 'none',
  })
}

async function runConnectionTest() {
  if (testing.value) {
    return
  }

  if (!hasApiKey.value) {
    errorMessage.value = '请先保存百炼 API Key，再开始测试。'
    testResult.value = null
    return
  }

  testing.value = true
  errorMessage.value = ''
  testResult.value = null

  try {
    const result = await testTravelAssistantConnection()
    testResult.value = {
      ok: true,
      message: `模型返回：${result.text}`,
      meta: `模型：${result.model} ｜ 耗时：${result.elapsedMs}ms`,
    }
  } catch (error) {
    testResult.value = {
      ok: false,
      message: error.message || '连接测试失败',
      meta: '请先确认 Key 是否完整、当前网络是否可访问百炼接口。',
    }
  } finally {
    testing.value = false
  }
}

function clearConversation() {
  messages.value = []
  clearAiMessages()
  errorMessage.value = ''
  uni.showToast({
    title: '会话已清空',
    icon: 'none',
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
  const userMessage = createMessage('user', content)
  const nextMessages = [...messages.value, userMessage]
  messages.value = nextMessages
  persistMessages()
  sending.value = true

  try {
    const answer = await chatWithTravelAssistant(nextMessages, extraContext)
    messages.value = [...nextMessages, createMessage('assistant', answer)]
    persistMessages()
  } catch (error) {
    messages.value = nextMessages
    persistMessages()
    errorMessage.value = error.message || 'AI 响应失败，请稍后再试。'
    uni.showToast({
      title: errorMessage.value,
      icon: 'none',
      duration: 2500,
    })
  } finally {
    sending.value = false
  }
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
  padding-top: 82rpx;
  padding-bottom: 64rpx;
  color: #ffffff;
  overflow: hidden;
}

.assistant-banner::after {
  content: '';
  position: absolute;
  right: -120rpx;
  top: 100rpx;
  width: 340rpx;
  height: 340rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  filter: blur(8rpx);
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.private-tools {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10rpx;
}

.mini-key-input {
  width: 240rpx;
  height: 54rpx;
  padding: 0 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 20rpx;
}

.mini-action {
  min-width: 54rpx;
  height: 54rpx;
  padding: 0 16rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 700;
}

.mini-action.dark {
  background: rgba(45, 24, 16, 0.28);
}

.mini-action.disabled {
  opacity: 0.5;
}

.hero-copy {
  margin-top: 54rpx;
  max-width: 520rpx;
}

.hero-kicker {
  display: block;
  font-size: 22rpx;
  letter-spacing: 6rpx;
  text-transform: uppercase;
  opacity: 0.72;
}

.banner-title {
  display: block;
  margin-top: 18rpx;
  font-size: 64rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.banner-subtitle {
  display: block;
  margin-top: 18rpx;
  font-size: 26rpx;
  opacity: 0.92;
  line-height: 1.6;
}

.hero-meta {
  margin-top: 38rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
  border-top: 2rpx solid rgba(255, 255, 255, 0.18);
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.18);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.meta-label {
  font-size: 20rpx;
  opacity: 0.68;
}

.meta-value {
  font-size: 26rpx;
  font-weight: 600;
}

.meta-divider {
  width: 2rpx;
  height: 42rpx;
  background: rgba(255, 255, 255, 0.2);
}

.hero-status {
  margin-top: 22rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
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
  font-size: 22rpx;
  opacity: 0.88;
}

.capability-shell {
  margin-top: 30rpx;
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

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
}

.capability-item {
  min-height: 168rpx;
  padding: 28rpx 24rpx;
  border-top: 4rpx solid rgba(196, 69, 54, 0.22);
  background: rgba(255, 255, 255, 0.72);
}

.capability-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.capability-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $theme-muted;
  line-height: 1.6;
}

.test-shell {
  margin-top: 24rpx;
}

.test-card {
  padding: 26rpx 28rpx;
  border-radius: 24rpx;
  border: 2rpx solid rgba(47, 125, 75, 0.18);
  background: rgba(47, 125, 75, 0.06);
}

.test-card.failed {
  border-color: rgba(196, 69, 54, 0.18);
  background: rgba(196, 69, 54, 0.08);
}

.test-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.test-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: $theme-text;
}

.test-meta {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
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
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.shortcut-pill {
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 2rpx solid rgba(196, 69, 54, 0.1);
  color: $theme-text;
  font-size: 24rpx;
}

.dialogue-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20rpx;
}

.dialogue-note {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
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
  padding: 30rpx;
  border-radius: 34rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 250, 245, 0.9));
  border: 2rpx solid rgba(196, 69, 54, 0.08);
  box-shadow: 0 24rpx 52rpx rgba(45, 24, 16, 0.07);
}

.empty-card {
  padding: 16rpx 0;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.empty-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.message-row {
  display: flex;
}

.message-row.assistant {
  width: 100%;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 86%;
  padding: 26rpx;
  border-radius: 26rpx;
  background: #f7f2ec;
}

.message-row.mine .message-bubble {
  border-radius: 24rpx;
  background: $theme-color;
  color: #ffffff;
}

.assistant-bubble {
  width: 100%;
  max-width: 100%;
  background: #ffffff;
  border: 2rpx solid rgba(196, 69, 54, 0.09);
  border-left: 8rpx solid rgba(196, 69, 54, 0.44);
  box-shadow: 0 16rpx 34rpx rgba(45, 24, 16, 0.05);
}

.message-role {
  display: block;
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  opacity: 0.68;
}

.message-content {
  display: block;
  margin-top: 10rpx;
  font-size: 25rpx;
  line-height: 1.8;
  white-space: pre-wrap;
}

.user-content {
  word-break: break-word;
}

.assistant-markdown {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.markdown-heading {
  display: block;
  color: $theme-text;
  font-weight: 700;
  line-height: 1.45;
}

.markdown-heading.level-1 {
  font-size: 34rpx;
}

.markdown-heading.level-2 {
  font-size: 31rpx;
}

.markdown-heading.level-3 {
  font-size: 28rpx;
}

.markdown-paragraph {
  display: block;
  color: $theme-text;
  font-size: 26rpx;
  line-height: 1.82;
  word-break: break-word;
  white-space: pre-wrap;
}

.markdown-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.markdown-list-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}

.markdown-marker {
  min-width: 34rpx;
  color: $theme-color;
  font-size: 25rpx;
  font-weight: 700;
  line-height: 1.8;
  text-align: right;
  flex-shrink: 0;
}

.markdown-list-content {
  flex: 1;
  color: $theme-text;
  font-size: 26rpx;
  line-height: 1.82;
  word-break: break-word;
}

.markdown-note {
  padding: 18rpx 22rpx;
  border-radius: 22rpx;
  background: rgba(196, 69, 54, 0.08);
  color: $theme-color;
  font-size: 24rpx;
  line-height: 1.7;
}

.strong {
  font-weight: 700;
  color: $theme-text;
}

.typing-row {
  margin-top: 24rpx;
  display: flex;
}

.typing-card {
  padding: 18rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.14);
}

.typing-text {
  font-size: 22rpx;
  color: $theme-muted;
}

.composer-space {
  height: 340rpx;
}

.composer-wrap {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(134rpx + env(safe-area-inset-bottom));
  z-index: 18;
}

.composer {
  padding: 16rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 46rpx rgba(45, 24, 16, 0.12);
}

.composer-input {
  width: 100%;
  min-height: 104rpx;
  max-height: 240rpx;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  background: #f5efe8;
  font-size: 26rpx;
  line-height: 1.6;
}

.composer-foot {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.composer-hint {
  font-size: 22rpx;
}

.send-btn {
  min-width: 132rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 20rpx;
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
  .capability-grid {
    grid-template-columns: 1fr;
  }

  .hero-meta {
    gap: 16rpx;
  }

  .meta-value {
    font-size: 24rpx;
  }

  .dialogue-head {
    align-items: flex-start;
  }
}
</style>
