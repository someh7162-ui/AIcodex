<template>
  <view class="detail-page page-shell">
    <view v-if="guide" class="detail-scroll page-scroll">      <view class="status-space" :style="statusBarStyle"></view>

      <view class="topbar">
        <view class="icon-btn" @tap="goBack">‹</view>
        <view class="author-strip">
          <image class="author-avatar" :src="guide.authorAvatar" mode="aspectFill"></image>
          <view class="author-copy">
            <text class="author-name">{{ guide.nickname || guide.author }}</text>
            <text class="author-meta" v-if="guide.authorFollowerCount || guide.authorFollowingCount">
              {{ formatCount(guide.authorFollowerCount) }} 粉丝 · {{ formatCount(guide.authorFollowingCount) }} 关注
            </text>
          </view>
        </view>
        <view class="topbar-actions">
          <view
            v-if="showFollowButton"
            class="follow-btn"
            :class="{ active: guide.isFollowingAuthor, disabled: followLoading }"
            @tap="handleFollowTap"
          >
            {{ followButtonText }}
          </view>
          <view v-else class="follow-btn muted-btn">{{ followButtonText }}</view>
          <view class="icon-btn share-btn">↗</view>
        </view>
      </view>

      <view class="media-shell">
        <view v-if="hasVideo" class="video-shell">
          <video class="detail-video" :src="guide.video" :poster="guide.videoPoster || guide.image" controls object-fit="cover"></video>
        </view>
        <swiper
          v-else-if="guideImages.length"
          class="media-swiper"
          circular
          :current="activeImageIndex"
          @change="handleSwiperChange"
        >
          <swiper-item v-for="(item, index) in guideImages" :key="`${item}-${index}`">
            <view class="media-slide" @tap="previewImage(index)">
              <CachedImage :src="item" image-class="cover-image" />
            </view>
          </swiper-item>
        </swiper>

        <view v-if="guideImages.length > 1" class="page-indicator">{{ activeImageIndex + 1 }}/{{ guideImages.length }}</view>
        <view v-if="guideImages.length > 1" class="dot-indicator">
          <view
            v-for="(item, index) in guideImages"
            :key="`${item}-dot-${index}`"
            class="dot"
            :class="{ active: activeImageIndex === index }"
          ></view>
        </view>

        <view v-if="!hasVideo && !guideImages.length" class="text-hero-card section">
          <text class="text-hero-kicker">{{ guide.locationTag || '新疆同城' }}</text>
          <text class="text-hero-copy">{{ guide.summaryText || guide.excerpt || '这是一条没有配图的文字笔记，适合直接查看内容和标签。' }}</text>
        </view>
      </view>

      <view class="content-shell section">
        <text class="note-title">{{ guide.title }}</text>

        <view v-if="detailTags.length" class="tag-row">
          <text v-for="item in detailTags" :key="item" class="tag-chip">#{{ item }}</text>
        </view>

        <view class="meta-row">
          <text class="meta-text">编辑于 {{ formatPublishMeta(guide.publishDate) }}</text>
        </view>
      </view>

      <view class="comment-head section">
        <view>
          <text class="comment-title">共 {{ formatCount(guide.commentCount) }} 条评论</text>
          <text class="comment-subtitle">{{ commentsLoading ? '正在加载评论...' : commentSummary }}</text>
        </view>
        <text class="comment-filter">最新</text>
      </view>

      <view class="input-preview section" @tap="focusComment">
        <image class="comment-avatar" :src="commentInputAvatar" mode="aspectFill"></image>
        <view class="fake-input">留下你的想法吧</view>
      </view>

      <view v-if="commentsLoading" class="comment-state section">
        <text class="comment-state-text">评论加载中...</text>
      </view>

      <view v-else-if="commentError" class="comment-state section">
        <text class="comment-state-text">{{ commentError }}</text>
        <view class="comment-retry" @tap="reloadComments">重新加载</view>
      </view>

      <view v-else-if="comments.length" class="comment-list section">
        <view v-for="c in comments" :key="c.id" class="comment-item">
          <image class="comment-avatar" :src="c.avatarUrl || guide.authorAvatar" mode="aspectFill"></image>
          <view class="comment-body-wrap">
            <view class="comment-row-top">
              <view class="comment-user-meta">
                <text class="comment-name">{{ c.nickname }}</text>
                <text v-if="c.authorId === guide.authorId" class="author-badge">作者</text>
                <text v-else-if="c.isAuthor" class="self-badge">我</text>
              </view>
              <text v-if="c.canDelete" class="comment-delete" @tap="removeComment(c)">{{ commentDeletingId === c.id ? '删除中' : '删除' }}</text>
            </view>
            <text class="comment-text comment-content">{{ c.content }}</text>
            <text class="comment-date">{{ formatCommentTime(c.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view v-else class="comment-state section empty-comment-state">
        <text class="comment-state-text">还没有评论，来抢个沙发吧。</text>
      </view>

      <view class="bottom-space detail-bottom-space"></view>
    </view>

    <view v-else-if="!detailLoading" class="empty-shell section">
      <text class="empty-title">攻略不存在</text>
      <view class="primary-btn narrow-btn" @tap="goBack">返回上一页</view>
    </view>

    <view v-if="guide" class="action-bar">
      <view class="action-composer">
        <textarea
          class="action-textarea"
          :class="{ focused: commentInputFocused }"
          v-model="commentInput"
          placeholder="说点什么..."
          maxlength="500"
          auto-height
          :focus="commentInputFocused"
          :show-confirm-bar="false"
          confirm-type="send"
          cursor-spacing="24"
          @focus="commentInputFocused = true"
          @blur="handleCommentBlur"
          @confirm="submitComment"
          @tap="focusComment"
        ></textarea>
        <view class="composer-side">
          <text class="composer-count">{{ commentInput.length }}/500</text>
          <view class="comment-send-btn" :class="{ disabled: commentSubmitDisabled }" @tap="submitComment">
            {{ commentSubmitting ? '发送中' : '发送' }}
          </view>
        </view>
      </view>
      <view class="action-icons">
        <view class="action-chip" @tap="toggleLike">
          <text :style="{ color: isLiked ? '#ff4d5c' : '' }">{{ isLiked ? '♥' : '♡' }}</text>
          {{ formatCount(likeCount) }}
        </view>
        <view class="action-chip" @tap="toggleSave">
          <text :style="{ color: isSaved ? '#f59e0b' : '' }">{{ isSaved ? '★' : '☆' }}</text>
          {{ formatCount(saveCount) }}
        </view>
        <view class="action-chip">◌ {{ formatCount(guide.commentCount) }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CachedImage from '../../components/CachedImage.vue'
import { clearAuthSession, getStoredAuthToken, getStoredAuthUser } from '../../common/auth-storage'
import { followUser, unfollowUser } from '../../services/auth'
import {
  deleteGuideComment,
  getGuideComments,
  getGuideDetail,
  likeGuide,
  postGuideComment,
  saveGuide,
  unlikeGuide,
  unsaveGuide,
} from '../../services/guides'

const guide = ref(null)
const activeImageIndex = ref(0)
const followLoading = ref(false)
const detailLoading = ref(true)
const isLiked = ref(false)
const isSaved = ref(false)
const likeCount = ref(0)
const saveCount = ref(0)
const likeSubmitting = ref(false)
const saveSubmitting = ref(false)
const comments = ref([])
const commentInput = ref('')
const commentSubmitting = ref(false)
const commentInputFocused = ref(false)
const commentsLoading = ref(false)
const commentError = ref('')
const commentDeletingId = ref('')

const systemInfo = typeof uni.getSystemInfoSync === 'function' ? uni.getSystemInfoSync() : {}
const statusBarHeight = systemInfo.statusBarHeight || 20
const statusBarStyle = computed(() => ({ height: `${statusBarHeight}px` }))

const guideImages = computed(() => {
  const images = guide.value?.images
  if (Array.isArray(images) && images.length) {
    return images
  }

  return guide.value?.image ? [guide.value.image] : []
})
const hasVideo = computed(() => Boolean(guide.value?.video))
const currentUser = computed(() => getStoredAuthUser() || null)
const isOwnAuthor = computed(() => {
  const authorId = guide.value?.authorId
  return Boolean(authorId && currentUser.value?.id && authorId === currentUser.value.id)
})
const showFollowButton = computed(() => Boolean(guide.value?.authorId))
const commentInputAvatar = computed(() => currentUser.value?.avatar_url || guide.value?.authorAvatar || '')
const commentSubmitDisabled = computed(() => commentSubmitting.value || !commentInput.value.trim())
const commentSummary = computed(() => {
  if (commentError.value) {
    return '评论加载失败，可重新刷新。'
  }

  if (!comments.value.length) {
    return '还没有人发言，欢迎留下第一条评论。'
  }

  return `已展示最新 ${comments.value.length} 条评论`
})
const followButtonText = computed(() => {
  if (!guide.value?.authorId) {
    return '作者'
  }

  if (isOwnAuthor.value) {
    return '我的'
  }

  if (followLoading.value) {
    return guide.value?.isFollowingAuthor ? '处理中' : '关注中'
  }

  return guide.value?.isFollowingAuthor ? '已关注' : '关注'
})

const detailTags = computed(() => {
  if (!guide.value) {
    return []
  }

  return [guide.value.locationTag, ...(guide.value.highlights || [])]
    .filter(Boolean)
    .map((item) => String(item).replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
})

const searchHint = computed(() => {
  const primary = detailTags.value[0] || guide.value?.location || '新疆旅游'
  return `${primary} 路线位置`
})

onLoad(async (options) => {
  const id = options?.id || ''
  detailLoading.value = true
  try {
    guide.value = await getGuideDetail(id)
    likeCount.value = Number(guide.value?.likesCount) || 0
    saveCount.value = Number(guide.value?.saveCount) || 0
    isLiked.value = Boolean(guide.value?.isLiked)
    isSaved.value = Boolean(guide.value?.isSaved)
    await loadComments(id)
  } catch (error) {
    guide.value = null
    uni.showToast({ title: error.message || '攻略加载失败', icon: 'none' })
  } finally {
    detailLoading.value = false
  }
  activeImageIndex.value = 0
})

async function toggleLike() {
  const token = getStoredAuthToken()
  if (!token) {
    promptLoginForComment('登录后才能点赞这条攻略。')
    return
  }
  if (!guide.value?.id || likeSubmitting.value) {
    return
  }

  likeSubmitting.value = true
  try {
    const result = isLiked.value
      ? await unlikeGuide(guide.value.id, token)
      : await likeGuide(guide.value.id, token)

    isLiked.value = Boolean(result?.liked)
    likeCount.value = Number(result?.likesCount) || 0
    saveCount.value = Number(result?.saveCount) || saveCount.value
    if (guide.value) {
      guide.value.likesCount = likeCount.value
      guide.value.saveCount = saveCount.value
      guide.value.isLiked = isLiked.value
    }
    uni.showToast({ title: isLiked.value ? '已点赞' : '已取消点赞', icon: 'none' })
  } catch (error) {
    if (error?.statusCode === 401) {
      clearAuthSession()
      promptLoginForComment('登录状态已失效，请重新登录后再点赞。')
      return
    }
    uni.showToast({ title: error.message || '点赞失败', icon: 'none' })
  } finally {
    likeSubmitting.value = false
  }
}

async function toggleSave() {
  const token = getStoredAuthToken()
  if (!token) {
    promptLoginForComment('登录后才能收藏这条攻略。')
    return
  }
  if (!guide.value?.id || saveSubmitting.value) {
    return
  }

  saveSubmitting.value = true
  try {
    const result = isSaved.value
      ? await unsaveGuide(guide.value.id, token)
      : await saveGuide(guide.value.id, token)

    isSaved.value = Boolean(result?.saved)
    likeCount.value = Number(result?.likesCount) || likeCount.value
    saveCount.value = Number(result?.saveCount) || 0
    if (guide.value) {
      guide.value.likesCount = likeCount.value
      guide.value.saveCount = saveCount.value
      guide.value.isSaved = isSaved.value
    }
    uni.showToast({ title: isSaved.value ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (error) {
    if (error?.statusCode === 401) {
      clearAuthSession()
      promptLoginForComment('登录状态已失效，请重新登录后再收藏。')
      return
    }
    uni.showToast({ title: error.message || '收藏失败', icon: 'none' })
  } finally {
    saveSubmitting.value = false
  }
}

function focusComment() {
  const token = getStoredAuthToken()
  if (!token) {
    promptLoginForComment('登录后才能评论，发送的内容会展示在这条攻略下。')
    return
  }
  commentInputFocused.value = true
}

function handleCommentBlur() {
  if (!commentInput.value.trim()) {
    commentInputFocused.value = false
  }
}

async function loadComments(slug = guide.value?.id || '') {
  if (!slug) {
    comments.value = []
    commentError.value = ''
    commentsLoading.value = false
    return
  }

  commentsLoading.value = true
  commentError.value = ''
  try {
    comments.value = await getGuideComments(slug)
  } catch (error) {
    comments.value = []
    commentError.value = error.message || '评论加载失败，请稍后重试。'
  } finally {
    commentsLoading.value = false
  }
}

function reloadComments() {
  loadComments(guide.value?.id || '')
}

async function submitComment() {
  const content = commentInput.value.trim()
  if (!content || commentSubmitting.value) return
  if (content.length > 500) {
    uni.showToast({ title: '评论不能超过 500 字', icon: 'none' })
    return
  }

  const token = getStoredAuthToken()
  if (!token) {
    promptLoginForComment('登录后才能发表评论。')
    return
  }

  const slug = guide.value?.id || ''
  if (!slug) {
    uni.showToast({ title: '攻略信息缺失，请返回重试', icon: 'none' })
    return
  }

  commentSubmitting.value = true
  try {
    const comment = await postGuideComment(slug, content, token)
    if (comment) {
      comments.value.unshift(comment)
      if (guide.value) guide.value.commentCount = (Number(guide.value.commentCount) || 0) + 1
    }
    commentError.value = ''
    commentInput.value = ''
    commentInputFocused.value = false
    await loadComments(slug)
    uni.showToast({ title: '评论成功', icon: 'success' })
  } catch (e) {
    if (e?.statusCode === 401) {
      clearAuthSession()
      commentInputFocused.value = false
      promptLoginForComment('登录状态已失效，请重新登录后再评论。')
      return
    }

    uni.showToast({ title: e.message || '评论失败', icon: 'none' })
  } finally {
    commentSubmitting.value = false
  }
}

function promptLoginForComment(content) {
  uni.showModal({
    title: '需要登录',
    content,
    success: ({ confirm }) => {
      if (confirm) {
        uni.navigateTo({ url: '/pages/auth/index?mode=login' })
      }
    },
  })
}

function removeComment(comment) {
  if (!comment?.id || !comment.canDelete || commentDeletingId.value) {
    return
  }

  uni.showModal({
    title: '删除评论',
    content: '删除后无法恢复，确认继续吗？',
    success: async ({ confirm }) => {
      if (!confirm) {
        return
      }

      const token = getStoredAuthToken()
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      commentDeletingId.value = comment.id
      try {
        await deleteGuideComment(guide.value?.id || '', comment.id, token)
        comments.value = comments.value.filter((item) => item.id !== comment.id)
        if (guide.value) {
          guide.value.commentCount = Math.max((Number(guide.value.commentCount) || 0) - 1, 0)
        }
        uni.showToast({ title: '评论已删除', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '删除失败', icon: 'none' })
      } finally {
        commentDeletingId.value = ''
      }
    },
  })
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }

  uni.reLaunch({ url: '/pages/guides/index' })
}

function handleSwiperChange(event) {
  activeImageIndex.value = event?.detail?.current || 0
}

function previewImage(index) {
  if (!guideImages.value.length) {
    return
  }

  uni.previewImage({
    current: guideImages.value[index] || guideImages.value[0],
    urls: guideImages.value,
  })
}

async function handleFollowTap() {
  if (!guide.value?.authorId || isOwnAuthor.value || followLoading.value) {
    return
  }

  const token = getStoredAuthToken()
  if (!token) {
    uni.showModal({
      title: '登录后可关注作者',
      content: '关注后，TA 发布的新攻略会优先出现在你的推荐流中。',
      success: ({ confirm }) => {
        if (confirm) {
          uni.navigateTo({ url: '/pages/auth/index?mode=login' })
        }
      },
    })
    return
  }

  followLoading.value = true
  try {
    const action = guide.value.isFollowingAuthor ? unfollowUser : followUser
    const response = await action(token, guide.value.authorId)
    const profile = response?.data || null
    guide.value = {
      ...guide.value,
      isFollowingAuthor: Boolean(profile?.isFollowing),
      authorFollowerCount: Number(profile?.followerCount) || 0,
      authorFollowingCount: Number(profile?.followingCount) || 0,
    }
    uni.showToast({
      title: guide.value.isFollowingAuthor ? '已关注作者' : '已取消关注',
      icon: 'none',
    })
  } catch (error) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  } finally {
    followLoading.value = false
  }
}

function formatCount(value) {
  const count = Number(value) || 0
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }

  return `${count}`
}

function formatPublishMeta(value) {
  if (!value) {
    return '刚刚'
  }

  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text.slice(5).replace('-', '-')
  }

  return text
}

function formatCommentTime(value) {
  if (!value) {
    return '刚刚'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  }
  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`
  }
  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`
  }
  if (diff < day * 7) {
    return `${Math.max(1, Math.floor(diff / day))} 天前`
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
@import '../../uni.scss';

.detail-page {
  background: #ffffff;
  min-height: 100vh;
}

.detail-scroll {
  padding-bottom: calc(170rpx + env(safe-area-inset-bottom));
}

.status-space {
  width: 100%;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 24rpx 22rpx;
  border-bottom: 2rpx solid rgba(15, 23, 42, 0.06);
}

.icon-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  line-height: 1;
  color: #1f2937;
}

.share-btn {
  font-size: 38rpx;
}

.author-strip {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.author-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.author-avatar,
.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(212, 165, 116, 0.18);
}

.author-name,
.comment-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $theme-text;
}

.author-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $theme-muted;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.follow-btn {
  min-width: 138rpx;
  height: 68rpx;
  padding: 0 30rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(196, 69, 54, 0.28);
  color: $theme-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}

.follow-btn.active {
  background: rgba(196, 69, 54, 0.08);
}

.follow-btn.disabled,
.muted-btn {
  opacity: 0.72;
}

.muted-btn {
  border-color: rgba(15, 23, 42, 0.1);
  color: $theme-muted;
}

.media-shell {
  position: relative;
  background: #ffffff;
}

.video-shell {
  background: #111111;
}

.detail-video {
  width: 100%;
  height: 760rpx;
  display: block;
}

.media-swiper {
  width: 100%;
  height: 760rpx;
}

.media-slide {
  width: 100%;
  height: 100%;
  background: #f8f8f8;
}

.page-indicator {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  min-width: 96rpx;
  height: 72rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: rgba(17, 17, 17, 0.45);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.dot-indicator {
  position: absolute;
  left: 50%;
  bottom: 22rpx;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.16);
}

.dot.active {
  background: #ff4d5c;
}

.text-hero-card {
  padding-top: 28rpx;
  padding-bottom: 18rpx;
}

.text-hero-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #fff1ec;
  color: #df5c46;
  font-size: 22rpx;
  font-weight: 600;
}

.text-hero-copy {
  display: block;
  margin-top: 18rpx;
  font-size: 28rpx;
  line-height: 1.85;
  color: $theme-text;
}

.content-shell {
  padding-top: 34rpx;
}

.note-title {
  display: block;
  font-size: 54rpx;
  font-weight: 700;
  line-height: 1.3;
  color: $theme-text;
}

.note-body {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  line-height: 1.85;
  color: $theme-text;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 18rpx;
  margin-top: 22rpx;
}

.tag-chip {
  font-size: 28rpx;
  color: #26456c;
}

.search-card {
  margin-top: 28rpx;
  height: 92rpx;
  border-radius: 24rpx;
  border: 2rpx solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 34rpx;
  color: $theme-muted;
}

.search-text {
  font-size: 26rpx;
  color: $theme-muted;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 28rpx;
}

.meta-text {
  font-size: 24rpx;
  color: $theme-muted;
}

.ghost-action {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: $theme-text;
}

.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 36rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid rgba(15, 23, 42, 0.06);
}

.comment-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $theme-text;
}

.comment-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $theme-muted;
}

.comment-filter {
  font-size: 24rpx;
  color: $theme-muted;
}

.input-preview {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 22rpx;
}

.fake-input {
  flex: 1;
  min-width: 0;
  height: 90rpx;
  border-radius: 999rpx;
  background: #f6f7f9;
  color: #a0a7b1;
  display: flex;
  align-items: center;
  padding: 0 26rpx;
  font-size: 28rpx;
}

.input-icons {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input-icon {
  font-size: 38rpx;
  color: $theme-muted;
}

.author-comment {
  margin-top: 26rpx;
}

.comment-user-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.comment-avatar.large {
  width: 76rpx;
  height: 76rpx;
}

.comment-user-copy {
  min-width: 0;
}

.comment-name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.author-badge {
  height: 40rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 97, 136, 0.12);
  color: #ff6188;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 600;
}

.self-badge {
  height: 40rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 600;
}

.comment-date {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $theme-muted;
}

.comment-body {
  margin-top: 20rpx;
  padding: 28rpx;
}

.comment-text {
  display: block;
  font-size: 28rpx;
  line-height: 1.85;
  color: $theme-text;
}

.highlight-box,
.tips-box,
.article-section {
  margin-top: 28rpx;
}

.highlight-box-title,
.tips-title,
.article-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $theme-text;
}

.highlight-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.highlight-item {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(232, 168, 124, 0.16);
  color: #9b5b2a;
  font-size: 24rpx;
}

.article-block + .article-block {
  margin-top: 24rpx;
}

.article-paragraph {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.9;
  color: $theme-text;
}

.tip-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}

.tip-row + .tip-row {
  margin-top: 16rpx;
}

.tip-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: $theme-color;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
  font-size: 25rpx;
  line-height: 1.75;
  color: $theme-text;
}

.comment-list {
  margin-top: 8rpx;
}

.comment-state {
  padding-top: 20rpx;
  padding-bottom: 12rpx;
}

.comment-state-text {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  color: $theme-muted;
}

.empty-comment-state {
  padding-bottom: 20rpx;
}

.comment-item {
  display: flex;
  gap: 18rpx;
  padding: 20rpx 0;
  border-bottom: 2rpx solid rgba(15, 23, 42, 0.05);
}

.comment-row-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.comment-user-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.comment-body-wrap {
  flex: 1;
  min-width: 0;
}

.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-delete {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #dc2626;
}

.comment-retry {
  margin-top: 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background: rgba(196, 69, 54, 0.12);
  color: $theme-color;
  font-size: 24rpx;
  font-weight: 600;
}

.comment-text {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: $theme-text;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.98);
  border-top: 2rpx solid rgba(15, 23, 42, 0.06);
}

.action-composer {
  flex: 1;
  min-width: 0;
  min-height: 84rpx;
  padding: 14rpx 18rpx;
  border-radius: 28rpx;
  background: #f6f7f9;
  display: flex;
  align-items: flex-end;
  gap: 14rpx;
}

.action-textarea {
  flex: 1;
  min-width: 0;
  min-height: 56rpx;
  max-height: 148rpx;
  padding: 10rpx 0;
  font-size: 27rpx;
  line-height: 1.5;
  color: $theme-text;
  background: transparent;
}

.action-textarea.focused {
  color: $theme-text;
}

.composer-side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}

.composer-count {
  font-size: 20rpx;
  color: $theme-muted;
}

.comment-send-btn {
  min-width: 104rpx;
  height: 60rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.comment-send-btn.disabled {
  opacity: 0.55;
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.action-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 25rpx;
  color: $theme-text;
}

.detail-bottom-space {
  height: 40rpx;
}

.empty-shell {
  padding-top: 180rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $theme-text;
}

.primary-btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: $theme-color;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.narrow-btn {
  width: 240rpx;
  margin-top: 28rpx;
}

@media screen and (max-width: 360px) {
  .topbar {
    gap: 12rpx;
  }

  .follow-btn {
    min-width: 116rpx;
    padding: 0 22rpx;
  }

  .media-swiper {
    height: 620rpx;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-composer {
    width: 100%;
  }

  .action-icons {
    justify-content: space-around;
  }
}
</style>
