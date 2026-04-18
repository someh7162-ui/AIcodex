const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const db = require('./db')
const { jwtSecret, port } = require('./config')

const avatarUploadDir = path.join(__dirname, '../uploads/avatars')
const guideUploadDir = path.join(__dirname, '../uploads/guides')

ensureDir(avatarUploadDir)
ensureDir(guideUploadDir)

const avatarUpload = multer({
  storage: createDiskStorage(avatarUploadDir),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const guideUpload = multer({
  storage: createDiskStorage(guideUploadDir),
  limits: { fileSize: 80 * 1024 * 1024 },
})

const app = express()

app.use(cors())
app.use(express.json({ limit: '4mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

function buildGuideQueryBase(viewerParamIndex = 1) {
  return `
    SELECT
      g.*,
      COALESCE(u.nickname, g.author) AS resolved_nickname,
      COALESCE(NULLIF(u.avatar_url, ''), NULLIF(g.author_avatar_url, ''), '') AS resolved_author_avatar_url,
      COALESCE(author_stats.follower_count, 0) AS author_follower_count,
      COALESCE(author_stats.following_count, 0) AS author_following_count,
      COALESCE(viewer_follow.is_following_author, FALSE) AS is_following_author,
      COALESCE(viewer_reactions.is_liked, FALSE) AS is_liked,
      COALESCE(viewer_reactions.is_saved, FALSE) AS is_saved,
      (
        CASE WHEN COALESCE(viewer_follow.is_following_author, FALSE) THEN 1000000 ELSE 0 END
        + COALESCE(g.likes_count, 0) * 20
        + COALESCE(g.save_count, 0) * 12
        + COALESCE(g.comment_count, 0) * 8
        + COALESCE(g.badge_count, 0) * 4
      ) AS recommendation_score
    FROM guides g
    LEFT JOIN users u ON u.id = g.author_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE uf.following_id = g.author_id)::INT AS follower_count,
        COUNT(*) FILTER (WHERE uf.follower_id = g.author_id)::INT AS following_count
      FROM user_follows uf
      WHERE uf.following_id = g.author_id OR uf.follower_id = g.author_id
    ) author_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT TRUE AS is_following_author
      FROM user_follows ufv
      WHERE ufv.follower_id = $${viewerParamIndex} AND ufv.following_id = g.author_id
      LIMIT 1
    ) viewer_follow ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        EXISTS(
          SELECT 1
          FROM guide_likes gl
          WHERE gl.user_id = $${viewerParamIndex} AND gl.guide_id = g.id
        ) AS is_liked,
        EXISTS(
          SELECT 1
          FROM user_favorites uf
          WHERE uf.user_id = $${viewerParamIndex} AND uf.target_type = 'guide' AND uf.target_id = g.id::TEXT
        ) AS is_saved
    ) viewer_reactions ON TRUE
  `
}

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true })
  }
}

function createDiskStorage(destination) {
  return multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || guessExtensionFromMime(file.mimetype)
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
    },
  })
}

function guessExtensionFromMime(mimeType = '') {
  if (mimeType.startsWith('video/')) {
    return '.mp4'
  }
  if (mimeType === 'image/png') {
    return '.png'
  }
  if (mimeType === 'image/webp') {
    return '.webp'
  }
  return '.jpg'
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeTextArray(value, limit = 20) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit)
}

function toTextArray(value) {
  return Array.isArray(value) ? value : []
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function deriveGuideCategory(subCategory = '') {
  const categoryMap = {
    自驾: '自驾建议',
    美食: '吃喝推荐',
    安全: '安全提醒',
    徒步: '户外探险',
    住宿: '住宿建议',
  }

  return categoryMap[subCategory] || '旅行分享'
}

function deriveGuideContentType({ contentType = '', video = '', images = [] } = {}) {
  if (contentType) {
    return contentType
  }
  if (video) {
    return '视频'
  }
  if (images.length) {
    return '图文'
  }
  return '文字'
}

function buildAssetUrl(req, assetPath = '') {
  const normalizedPath = String(assetPath || '').trim()
  if (!normalizedPath) {
    return ''
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim()
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim()
  if (!forwardedHost) {
    return normalizedPath
  }

  const runtimeOrigin = `${forwardedProto}://${forwardedHost}`
  const legacyOrigins = [
    'https://111.20.31.227:34144',
    'http://111.20.31.227:34144',
    'https://frp-arm.com:44637',
    'http://frp-arm.com:44637',
  ]

  if (/^https?:\/\//i.test(normalizedPath)) {
    const legacyOrigin = legacyOrigins.find((origin) => normalizedPath.startsWith(origin))
    return legacyOrigin ? `${runtimeOrigin}${normalizedPath.slice(legacyOrigin.length)}` : normalizedPath
  }

  return `${runtimeOrigin}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
}

function normalizeStoredAssetPath(assetPath = '') {
  const normalizedPath = String(assetPath || '').trim()
  if (!normalizedPath) {
    return ''
  }

  const legacyOrigins = [
    'https://111.20.31.227:34144',
    'http://111.20.31.227:34144',
    'https://frp-arm.com:44637',
    'http://frp-arm.com:44637',
    'https://yd.frp-arm.com:44637',
    'http://yd.frp-arm.com:44637',
  ]

  if (/^https?:\/\//i.test(normalizedPath)) {
    const matched = legacyOrigins.find((origin) => normalizedPath.startsWith(origin))
    if (matched) {
      const suffix = normalizedPath.slice(matched.length)
      return suffix.startsWith('/') ? suffix : `/${suffix}`
    }
    return normalizedPath
  }

  if (/^(111\.20\.31\.227:34144|frp-arm\.com:44637|yd\.frp-arm\.com:44637)(\/|\?|$)/i.test(normalizedPath)) {
    const [, suffix = ''] = normalizedPath.match(/^(?:111\.20\.31\.227:34144|frp-arm\.com:44637|yd\.frp-arm\.com:44637)(.*)$/i) || []
    return suffix ? (suffix.startsWith('/') ? suffix : `/${suffix}`) : ''
  }

  return normalizedPath.startsWith('/') ? normalizedPath : normalizedPath
}

function normalizeStoredAssetArray(values = []) {
  return values.map((item) => normalizeStoredAssetPath(item)).filter(Boolean)
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      jti: crypto.randomUUID(),
      email: user.email,
      nickname: user.nickname,
    },
    jwtSecret,
    { expiresIn: '30d' }
  )
}

function parseAuthToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function publicUser(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    avatar_url: row.avatar_url || '',
    status: row.status,
  }
}

function mapPublicUser(req, row) {
  const user = publicUser(row)
  return {
    ...user,
    avatar_url: buildAssetUrl(req, user.avatar_url || ''),
  }
}

function publicProfile(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    avatar_url: row.avatar_url || '',
    status: row.status,
    followerCount: Number(row.follower_count) || 0,
    followingCount: Number(row.following_count) || 0,
    isFollowing: Boolean(row.is_following),
  }
}

function mapGuideComment(req, row, viewerId = null) {
  const userId = row.user_id || ''
  const guideAuthorId = row.guide_author_id || ''

  return {
    id: String(row.id),
    content: row.content,
    nickname: row.nickname,
    avatarUrl: buildAssetUrl(req, row.avatar_url || ''),
    createdAt: row.created_at,
    authorId: userId,
    isAuthor: Boolean(viewerId && userId && viewerId === userId),
    canDelete: Boolean(viewerId && ((userId && viewerId === userId) || (guideAuthorId && viewerId === guideAuthorId))),
  }
}

function mapDestination(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    region: row.region,
    category: row.category,
    rating: row.rating === null ? '' : String(row.rating),
    coordinates: {
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
    },
    description: row.description,
    image: row.image_url || '',
    weather: row.weather || {},
    tips: toTextArray(row.tips),
    suggestion: row.suggestion || '',
    liveTitle: row.live_title || '',
    liveHint: row.live_hint || '',
    liveKeyword: row.live_keyword || '',
    culture: {
      overview: row.culture_overview || '',
      history: row.culture_history || '',
      highlights: row.culture_highlights || '',
    },
    travelMeta: {
      season: row.recommended_season || '',
      stay: row.recommended_stay || '',
      audience: row.suitable_audience || '',
    },
    visitMeta: {
      ticket: row.ticket_reference || '',
      openHours: row.open_hours || '',
    },
  }
}

function mapGuide(req, row, sections = []) {
  const rawImages = toTextArray(row.images)
  const imageList = rawImages.length
    ? rawImages.map((item) => buildAssetUrl(req, item)).filter(Boolean)
    : (row.image_url ? [buildAssetUrl(req, row.image_url)] : [])
  const videoUrl = buildAssetUrl(req, row.video_url || '')
  const videoPosterUrl = buildAssetUrl(req, row.video_poster_url || '')
  const previewImage = imageList[0] || videoPosterUrl || buildAssetUrl(req, row.image_url || '')

  return {
    id: row.slug,
    title: row.title,
    category: row.category,
    readTime: row.read_time || '',
    author: row.author,
    publishDate: row.publish_date ? row.publish_date.toISOString().slice(0, 10) : '',
    views: row.views,
    likes: row.likes,
    location: row.location || '',
    image: previewImage,
    images: imageList,
    excerpt: row.excerpt || '',
    highlights: toTextArray(row.highlights),
    sections,
    tips: toTextArray(row.tips),
    nickname: row.resolved_nickname || row.author,
    authorAvatar: buildAssetUrl(req, row.resolved_author_avatar_url || ''),
    authorId: row.author_id || '',
    authorFollowerCount: Number(row.author_follower_count) || 0,
    authorFollowingCount: Number(row.author_following_count) || 0,
    isFollowingAuthor: Boolean(row.is_following_author),
    isLiked: Boolean(row.is_liked),
    isSaved: Boolean(row.is_saved),
    primaryTab: row.primary_tab || '发现',
    cityTab: row.city_tab || '同城',
    subCategory: row.sub_category || '推荐',
    contentType: deriveGuideContentType({ contentType: row.content_type, video: videoUrl, images: imageList }),
    likesCount: Number(row.likes_count) || 0,
    saveCount: Number(row.save_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    coverAspectRatio: Number(row.cover_aspect_ratio) || (previewImage ? 1.42 : 0.9),
    badgeCount: Number(row.badge_count) || 0,
    locationTag: row.location_tag || row.location || '新疆同城',
    imageCount: imageList.length,
    video: videoUrl,
    videoPoster: videoPosterUrl,
    summaryText: row.summary_text || row.excerpt || '',
    hasMedia: Boolean(previewImage || videoUrl),
    recommendationScore: Number(row.recommendation_score) || 0,
  }
}

async function createSession(user, token, req) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, device_name, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      user.id,
      hashToken(token),
      'uni-app',
      req.ip || null,
      req.get('user-agent') || null,
      expiresAt,
    ]
  )
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

async function fetchGuideSections(guideId, client = db) {
  const result = await client.query(
    `
      SELECT title, paragraphs
      FROM guide_sections
      WHERE guide_id = $1
      ORDER BY sort_order ASC
    `,
    [guideId]
  )

  return result.rows.map((row) => ({
    title: row.title,
    paragraphs: toTextArray(row.paragraphs),
  }))
}

async function fetchGuideBySlug(req, slug, client = db) {
  const viewerId = req.user?.sub || null
  const result = await client.query(
    `
      ${buildGuideQueryBase(1)}
      WHERE g.slug = $2 AND g.status = 'published'
      LIMIT 1
    `,
    [viewerId, slug]
  )

  const row = result.rows[0]
  if (!row) {
    return null
  }

  const sections = await fetchGuideSections(row.id, client)
  return mapGuide(req, row, sections)
}

async function fetchUserProfileById(userId, viewerId, client = db) {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.nickname,
        u.avatar_url,
        u.status,
        (
          SELECT COUNT(*)::INT
          FROM user_follows uf
          WHERE uf.following_id = u.id
        ) AS follower_count,
        (
          SELECT COUNT(*)::INT
          FROM user_follows uf
          WHERE uf.follower_id = u.id
        ) AS following_count,
        EXISTS(
          SELECT 1
          FROM user_follows uf
          WHERE uf.follower_id = $2 AND uf.following_id = u.id
        ) AS is_following
      FROM users u
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId, viewerId || null]
  )

  return result.rows[0] ? publicProfile(result.rows[0]) : null
}

function authMiddleware(req, res, next) {
  const token = parseAuthToken(req)
  if (!token) {
    res.status(401).json({ message: '未登录。' })
    return
  }
  try {
    req.user = jwt.verify(token, jwtSecret)
    next()
  } catch {
    res.status(401).json({ message: 'Token 无效或已过期。' })
  }
}

function optionalAuthMiddleware(req, res, next) {
  const token = parseAuthToken(req)
  if (!token) {
    req.user = null
    next()
    return
  }

  try {
    req.user = jwt.verify(token, jwtSecret)
  } catch {
    req.user = null
  }

  next()
}

app.get('/api/health', asyncRoute(async (req, res) => {
  const result = await db.query('SELECT current_database() AS database, current_user AS username')
  res.json({ ok: true, database: result.rows[0] })
}))

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const password = String(req.body.password || '')
  const nickname = normalizeText(req.body.nickname)

  if (!nickname) {
    res.status(400).json({ message: '请输入昵称。' })
    return
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ message: '请输入正确的邮箱格式。' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ message: '密码至少 6 位。' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await db.query(
      `
        INSERT INTO users (email, password_hash, nickname)
        VALUES ($1, $2, $3)
        RETURNING id, email, nickname, avatar_url, status
      `,
      [email, passwordHash, nickname]
    )
    const user = publicUser(result.rows[0])
    const token = signToken(user)
    await createSession(user, token, req)
    res.status(201).json({ token, user })
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ message: '该邮箱已注册，请直接登录。' })
      return
    }
    throw error
  }
}))

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const password = String(req.body.password || '')

  if (!email || !password) {
    res.status(400).json({ message: '请输入邮箱和密码。' })
    return
  }

  const result = await db.query(
    `
      SELECT id, email, password_hash, nickname, avatar_url, status
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  )

  const row = result.rows[0]
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    res.status(401).json({ message: '邮箱或密码错误。' })
    return
  }

  if (row.status !== 'active') {
    res.status(403).json({ message: '账号不可用，请联系管理员。' })
    return
  }

  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id])
  const user = publicUser(row)
  const token = signToken(user)
  await createSession(user, token, req)
  res.json({ token, user })
}))

app.get('/api/destinations', asyncRoute(async (req, res) => {
  const keyword = normalizeText(req.query.keyword)
  const category = normalizeText(req.query.category)
  const region = normalizeText(req.query.region)
  const params = []
  const where = ["status = 'published'"]

  if (keyword) {
    params.push(`%${keyword}%`)
    where.push(`(name ILIKE $${params.length} OR location ILIKE $${params.length} OR region ILIKE $${params.length} OR category ILIKE $${params.length})`)
  }

  if (category && category !== '全部') {
    params.push(category)
    where.push(`category = $${params.length}`)
  }

  if (region && region !== '全部') {
    params.push(region)
    where.push(`region = $${params.length}`)
  }

  const result = await db.query(
    `
      SELECT *
      FROM destinations
      WHERE ${where.join(' AND ')}
      ORDER BY sort_order ASC, id ASC
    `,
    params
  )

  res.json({ list: result.rows.map(mapDestination) })
}))

app.get('/api/destinations/:id', asyncRoute(async (req, res) => {
  const result = await db.query(
    `
      SELECT *
      FROM destinations
      WHERE id = $1 AND status = 'published'
      LIMIT 1
    `,
    [req.params.id]
  )

  if (!result.rows[0]) {
    res.status(404).json({ message: '景区不存在。' })
    return
  }

  res.json({ data: mapDestination(result.rows[0]) })
}))

app.get('/api/guides', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  const viewerId = req.user?.sub || null
  const scope = normalizeText(req.query.scope)
  const where = ["g.status = 'published'"]
  const params = [viewerId]

  if (scope === 'following' && viewerId) {
    params.push(viewerId)
    where.push(`EXISTS (SELECT 1 FROM user_follows uf WHERE uf.follower_id = $${params.length} AND uf.following_id = g.author_id)`)
  }

  const result = await db.query(
    `
      ${buildGuideQueryBase(1)}
      WHERE ${where.join(' AND ')}
      ORDER BY
        COALESCE(is_following_author, FALSE) DESC,
        recommendation_score DESC,
        g.sort_order ASC,
        g.publish_date DESC NULLS LAST,
        g.created_at DESC
    `,
    params
  )

  res.json({ list: result.rows.map((row) => mapGuide(req, row)) })
}))

app.post('/api/users/me/avatar', authMiddleware, avatarUpload.single('avatar'), asyncRoute(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: '未收到文件。' })
    return
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`
  await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.sub])
  res.json({ avatar_url: buildAssetUrl(req, avatarUrl) })
}))

app.get('/api/users/me', authMiddleware, asyncRoute(async (req, res) => {
  const result = await db.query(
    `SELECT id, email, nickname, avatar_url, status FROM users WHERE id = $1 LIMIT 1`,
    [req.user.sub]
  )

  const user = result.rows[0]
  if (!user) {
    res.status(404).json({ message: '用户不存在。' })
    return
  }

  res.json({ user: mapPublicUser(req, user) })
}))

app.patch('/api/users/me', authMiddleware, asyncRoute(async (req, res) => {
  const { nickname, avatar_url } = req.body
  const updates = []
  const params = []

  if (nickname !== undefined) {
    const nextNickname = normalizeText(nickname)
    if (!nextNickname) {
      res.status(400).json({ message: '昵称不能为空。' })
      return
    }
    params.push(nextNickname)
    updates.push(`nickname = $${params.length}`)
  }

  if (avatar_url !== undefined) {
    params.push(String(avatar_url || ''))
    updates.push(`avatar_url = $${params.length}`)
  }

  if (!updates.length) {
    res.status(400).json({ message: '无可更新字段。' })
    return
  }

  params.push(req.user.sub)
  const result = await db.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, email, nickname, avatar_url, status`,
    params
  )
  res.json({ user: publicUser(result.rows[0]) })
}))

app.get('/api/users/me/guides', authMiddleware, asyncRoute(async (req, res) => {
  const result = await db.query(
    `
      ${buildGuideQueryBase(1)}
      WHERE g.author_id = $2
      ORDER BY g.publish_date DESC NULLS LAST, g.created_at DESC
    `,
    [req.user.sub, req.user.sub]
  )
  res.json({ list: result.rows.map((row) => mapGuide(req, row)) })
}))

app.get('/api/users/me/favorites/guides', authMiddleware, asyncRoute(async (req, res) => {
  const result = await db.query(
    `
      ${buildGuideQueryBase(1)}
      INNER JOIN user_favorites fav
        ON fav.target_type = 'guide'
       AND fav.target_id = g.id::TEXT
       AND fav.user_id = $2
      WHERE g.status = 'published'
      ORDER BY fav.created_at DESC, g.publish_date DESC NULLS LAST, g.created_at DESC
    `,
    [req.user.sub, req.user.sub]
  )

  res.json({ list: result.rows.map((row) => mapGuide(req, row)) })
}))

app.get('/api/users/me/stats', authMiddleware, asyncRoute(async (req, res) => {
  const guidesResult = await db.query(
    `
      SELECT
        COUNT(*)::INT AS guide_count,
        COUNT(DISTINCT NULLIF(TRIM(COALESCE(location_tag, location, '')), ''))::INT AS visited_count
      FROM guides
      WHERE author_id = $1 AND status = 'published'
    `,
    [req.user.sub]
  )

  const favoritesResult = await db.query(
    `
      SELECT COUNT(*)::INT AS favorite_count
      FROM user_favorites
      WHERE user_id = $1 AND target_type = 'guide'
    `,
    [req.user.sub]
  )

  const guideCount = Number(guidesResult.rows[0]?.guide_count) || 0
  const visitedCount = Number(guidesResult.rows[0]?.visited_count) || 0
  const favoriteCount = Number(favoritesResult.rows[0]?.favorite_count) || 0

  res.json({
    data: {
      guideCount,
      favoriteCount,
      visitedCount,
      interactionCount: guideCount + favoriteCount,
    },
  })
}))

app.get('/api/users/:id/profile', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  const profile = await fetchUserProfileById(req.params.id, req.user?.sub || null)
  if (!profile) {
    res.status(404).json({ message: '用户不存在。' })
    return
  }

  res.json({ data: profile })
}))

app.post('/api/users/:id/follow', authMiddleware, asyncRoute(async (req, res) => {
  const targetUserId = req.params.id
  if (!targetUserId) {
    res.status(400).json({ message: '缺少目标用户。' })
    return
  }

  if (targetUserId === req.user.sub) {
    res.status(400).json({ message: '不能关注自己。' })
    return
  }

  const targetUser = await db.query(
    `SELECT id FROM users WHERE id = $1 AND status = 'active' LIMIT 1`,
    [targetUserId]
  )
  if (!targetUser.rows[0]) {
    res.status(404).json({ message: '目标用户不存在。' })
    return
  }

  await db.query(
    `
      INSERT INTO user_follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT (follower_id, following_id) DO NOTHING
    `,
    [req.user.sub, targetUserId]
  )

  const profile = await fetchUserProfileById(targetUserId, req.user.sub)
  res.status(201).json({ data: profile })
}))

app.delete('/api/users/:id/follow', authMiddleware, asyncRoute(async (req, res) => {
  const targetUserId = req.params.id
  if (!targetUserId) {
    res.status(400).json({ message: '缺少目标用户。' })
    return
  }

  await db.query(
    `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
    [req.user.sub, targetUserId]
  )

  const profile = await fetchUserProfileById(targetUserId, req.user.sub)
  if (!profile) {
    res.status(404).json({ message: '目标用户不存在。' })
    return
  }

  res.json({ data: profile })
}))

app.post('/api/users/me/guides/:slug/claim', authMiddleware, asyncRoute(async (req, res) => {
  await db.query(
    `UPDATE guides SET author_id = $1 WHERE slug = $2 AND author_id IS NULL`,
    [req.user.sub, req.params.slug]
  )
  res.json({ ok: true })
}))

app.post('/api/guides/media', authMiddleware, guideUpload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: '未收到媒体文件。' })
    return
  }

  const mediaUrl = `/uploads/guides/${req.file.filename}`
  res.status(201).json({
    url: buildAssetUrl(req, mediaUrl),
    path: mediaUrl,
    mediaType: normalizeText(req.body.mediaType) || req.file.mimetype,
  })
}))

app.post('/api/guides', authMiddleware, asyncRoute(async (req, res) => {
  const title = normalizeText(req.body.title)
  const excerpt = normalizeText(req.body.excerpt)
  const summaryText = normalizeText(req.body.summaryText || req.body.summary || req.body.excerpt)
  const images = normalizeStoredAssetArray(normalizeTextArray(req.body.images, 9))
  const video = normalizeStoredAssetPath(normalizeText(req.body.video))
  const videoPoster = normalizeStoredAssetPath(normalizeText(req.body.videoPoster))
  const highlights = normalizeTextArray(req.body.highlights, 8)
  const tips = normalizeTextArray(req.body.tips, 12)
  const contentType = deriveGuideContentType({ contentType: normalizeText(req.body.contentType), video, images })
  const subCategory = normalizeText(req.body.subCategory) || '推荐'
  const category = normalizeText(req.body.category) || deriveGuideCategory(subCategory)
  const location = normalizeText(req.body.location) || '新疆同城'
  const locationTag = normalizeText(req.body.locationTag) || location
  const coverAspectRatio = parsePositiveNumber(req.body.coverAspectRatio, video ? 1.45 : (images.length ? 1.34 : 0.84))
  const readTime = normalizeText(req.body.readTime) || '2 分钟阅读'
  const sectionItems = Array.isArray(req.body.sections)
    ? req.body.sections
        .map((item) => ({
          title: normalizeText(item?.title) || '笔记内容',
          paragraphs: normalizeTextArray(item?.paragraphs, 10),
        }))
        .filter((item) => item.paragraphs.length)
    : []

  if (!title || title.length < 4) {
    res.status(400).json({ message: '标题至少写 4 个字。' })
    return
  }

  if (!summaryText && !highlights.length && !images.length && !video) {
    res.status(400).json({ message: '至少补一句描述、几个标签，或者上传媒体内容。' })
    return
  }

  const userResult = await db.query(
    `SELECT id, nickname, email, avatar_url, status FROM users WHERE id = $1 LIMIT 1`,
    [req.user.sub]
  )
  const user = userResult.rows[0]
  if (!user) {
    res.status(401).json({ message: '当前账号不存在，请重新登录。' })
    return
  }

  const slug = `published-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')

    const insertGuideResult = await client.query(
      `
        INSERT INTO guides (
          slug,
          title,
          category,
          sub_category,
          content_type,
          read_time,
          author,
          author_id,
          author_avatar_url,
          publish_date,
          views,
          likes,
          likes_count,
          save_count,
          comment_count,
          location,
          location_tag,
          image_url,
          images,
          video_url,
          video_poster_url,
          excerpt,
          summary_text,
          highlights,
          tips,
          primary_tab,
          city_tab,
          cover_aspect_ratio,
          badge_count,
          sort_order,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, '0', '0', 0, 0, 0,
          $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, '发现', '同城', $20, 1, 0, 'published'
        )
        RETURNING id
      `,
      [
        slug,
        title,
        category,
        subCategory,
        contentType,
        readTime,
        user.nickname,
        user.id,
        user.avatar_url || '',
        location,
        locationTag,
        images[0] || videoPoster || '',
        images,
        video,
        videoPoster,
        excerpt || summaryText,
        summaryText || excerpt,
        highlights,
        tips,
        coverAspectRatio,
      ]
    )

    const guideId = insertGuideResult.rows[0].id
    for (let index = 0; index < sectionItems.length; index += 1) {
      const section = sectionItems[index]
      await client.query(
        `
          INSERT INTO guide_sections (guide_id, title, paragraphs, sort_order)
          VALUES ($1, $2, $3, $4)
        `,
        [guideId, section.title, section.paragraphs, index]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  const guide = await fetchGuideBySlug(req, slug)
  res.status(201).json({ data: guide })
}))

app.get('/api/guides/:slug', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  const guide = await fetchGuideBySlug(req, req.params.slug)
  if (!guide) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  res.json({ data: guide })
}))

app.get('/api/guides/:slug/comments', optionalAuthMiddleware, asyncRoute(async (req, res) => {
  const viewerId = req.user?.sub || null
  const guideResult = await db.query(`SELECT id, author_id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) { res.status(404).json({ message: '攻略不存在。' }); return }
  const guideId = guideResult.rows[0].id
  const result = await db.query(
    `SELECT c.id, c.content, c.created_at,
       COALESCE(u.nickname, c.author_name) AS nickname,
       COALESCE(u.avatar_url, '') AS avatar_url,
       c.user_id,
       $2::UUID AS guide_author_id
     FROM guide_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.guide_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50`,
    [guideId, guideResult.rows[0].author_id || null]
  )
  res.json({ list: result.rows.map((row) => mapGuideComment(req, row, viewerId)) })
}))

app.post('/api/guides/:slug/comments', authMiddleware, asyncRoute(async (req, res) => {
  const content = normalizeText(req.body.content)
  if (!content) { res.status(400).json({ message: '评论内容不能为空。' }); return }
  if (content.length > 500) { res.status(400).json({ message: '评论不能超过 500 字。' }); return }

  const guideResult = await db.query(`SELECT id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) { res.status(404).json({ message: '攻略不存在。' }); return }
  const guideId = guideResult.rows[0].id

  const userResult = await db.query(`SELECT id, nickname, avatar_url FROM users WHERE id = $1 LIMIT 1`, [req.user.sub])
  const user = userResult.rows[0]

  const result = await db.query(
    `INSERT INTO guide_comments (guide_id, user_id, author_name, content)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [guideId, user.id, user.nickname, content]
  )
  await db.query(`UPDATE guides SET comment_count = comment_count + 1 WHERE id = $1`, [guideId])

  res.status(201).json({ comment: {
    id: String(result.rows[0].id),
    content,
    nickname: user.nickname,
    avatarUrl: buildAssetUrl(req, user.avatar_url || ''),
    createdAt: result.rows[0].created_at,
    authorId: user.id,
    isAuthor: true,
    canDelete: true,
  }})
}))

app.post('/api/guides/:slug/like', authMiddleware, asyncRoute(async (req, res) => {
  const guideResult = await db.query(`SELECT id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  const guideId = guideResult.rows[0].id
  const userId = req.user.sub
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')
    const insertResult = await client.query(
      `INSERT INTO guide_likes (guide_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (guide_id, user_id) DO NOTHING
       RETURNING id`,
      [guideId, userId]
    )

    if (insertResult.rowCount > 0) {
      await client.query(`UPDATE guides SET likes_count = likes_count + 1 WHERE id = $1`, [guideId])
    }

    const statsResult = await client.query(
      `SELECT likes_count, save_count FROM guides WHERE id = $1 LIMIT 1`,
      [guideId]
    )
    await client.query('COMMIT')

    res.json({
      liked: true,
      likesCount: Number(statsResult.rows[0]?.likes_count) || 0,
      saveCount: Number(statsResult.rows[0]?.save_count) || 0,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.delete('/api/guides/:slug/like', authMiddleware, asyncRoute(async (req, res) => {
  const guideResult = await db.query(`SELECT id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  const guideId = guideResult.rows[0].id
  const userId = req.user.sub
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')
    const deleteResult = await client.query(
      `DELETE FROM guide_likes WHERE guide_id = $1 AND user_id = $2 RETURNING id`,
      [guideId, userId]
    )

    if (deleteResult.rowCount > 0) {
      await client.query(
        `UPDATE guides SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`,
        [guideId]
      )
    }

    const statsResult = await client.query(
      `SELECT likes_count, save_count FROM guides WHERE id = $1 LIMIT 1`,
      [guideId]
    )
    await client.query('COMMIT')

    res.json({
      liked: false,
      likesCount: Number(statsResult.rows[0]?.likes_count) || 0,
      saveCount: Number(statsResult.rows[0]?.save_count) || 0,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.post('/api/guides/:slug/save', authMiddleware, asyncRoute(async (req, res) => {
  const guideResult = await db.query(`SELECT id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  const guideId = guideResult.rows[0].id
  const userId = req.user.sub
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')
    const insertResult = await client.query(
      `INSERT INTO user_favorites (user_id, target_type, target_id)
       VALUES ($1, 'guide', $2)
       ON CONFLICT (user_id, target_type, target_id) DO NOTHING
       RETURNING id`,
      [userId, guideId]
    )

    if (insertResult.rowCount > 0) {
      await client.query(`UPDATE guides SET save_count = save_count + 1 WHERE id = $1`, [guideId])
    }

    const statsResult = await client.query(
      `SELECT likes_count, save_count FROM guides WHERE id = $1 LIMIT 1`,
      [guideId]
    )
    await client.query('COMMIT')

    res.json({
      saved: true,
      likesCount: Number(statsResult.rows[0]?.likes_count) || 0,
      saveCount: Number(statsResult.rows[0]?.save_count) || 0,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.delete('/api/guides/:slug/save', authMiddleware, asyncRoute(async (req, res) => {
  const guideResult = await db.query(`SELECT id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  const guideId = guideResult.rows[0].id
  const userId = req.user.sub
  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')
    const deleteResult = await client.query(
      `DELETE FROM user_favorites
       WHERE user_id = $1 AND target_type = 'guide' AND target_id = $2
       RETURNING id`,
      [userId, guideId]
    )

    if (deleteResult.rowCount > 0) {
      await client.query(
        `UPDATE guides SET save_count = GREATEST(save_count - 1, 0) WHERE id = $1`,
        [guideId]
      )
    }

    const statsResult = await client.query(
      `SELECT likes_count, save_count FROM guides WHERE id = $1 LIMIT 1`,
      [guideId]
    )
    await client.query('COMMIT')

    res.json({
      saved: false,
      likesCount: Number(statsResult.rows[0]?.likes_count) || 0,
      saveCount: Number(statsResult.rows[0]?.save_count) || 0,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

app.delete('/api/guides/:slug/comments/:commentId', authMiddleware, asyncRoute(async (req, res) => {
  const guideResult = await db.query(`SELECT id, author_id FROM guides WHERE slug = $1 LIMIT 1`, [req.params.slug])
  if (!guideResult.rows[0]) {
    res.status(404).json({ message: '攻略不存在。' })
    return
  }

  const commentResult = await db.query(
    `SELECT id, user_id
     FROM guide_comments
     WHERE id = $1 AND guide_id = $2
     LIMIT 1`,
    [req.params.commentId, guideResult.rows[0].id]
  )

  const comment = commentResult.rows[0]
  if (!comment) {
    res.status(404).json({ message: '评论不存在。' })
    return
  }

  const viewerId = req.user.sub
  const isCommentAuthor = comment.user_id && String(comment.user_id) === String(viewerId)
  const isGuideAuthor = guideResult.rows[0].author_id && String(guideResult.rows[0].author_id) === String(viewerId)

  if (!isCommentAuthor && !isGuideAuthor) {
    res.status(403).json({ message: '你没有权限删除这条评论。' })
    return
  }

  const client = await db.pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM guide_comments WHERE id = $1 AND guide_id = $2`, [comment.id, guideResult.rows[0].id])
    await client.query(
      `UPDATE guides SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1`,
      [guideResult.rows[0].id]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  res.json({ ok: true })
}))

app.use((req, res) => {
  res.status(404).json({ message: '接口不存在。' })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: '服务器内部错误。' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Meet Xinjiang API listening on http://0.0.0.0:${port}/api`)
})
