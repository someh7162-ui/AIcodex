const { Pool } = require('pg')
const config = require('./config')

const legacyOrigins = [
  'https://111.20.31.227:34144',
  'http://111.20.31.227:34144',
  'https://frp-arm.com:44637',
  'http://frp-arm.com:44637',
  'https://yd.frp-arm.com:44637',
  'http://yd.frp-arm.com:44637',
]

function normalizeStoredAssetPath(assetPath = '') {
  const normalizedPath = String(assetPath || '').trim()
  if (!normalizedPath) {
    return ''
  }

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

  return normalizedPath
}

function normalizeArray(values) {
  return Array.isArray(values) ? values.map((item) => normalizeStoredAssetPath(item)).filter(Boolean) : []
}

async function run() {
  const pool = new Pool(config.db)
  const client = await pool.connect()
  let updated = 0

  try {
    const result = await client.query('SELECT id, slug, image_url, images, video_url, video_poster_url, author_avatar_url FROM guides')

    for (const row of result.rows) {
      const nextImage = normalizeStoredAssetPath(row.image_url)
      const nextImages = normalizeArray(row.images)
      const nextVideo = normalizeStoredAssetPath(row.video_url)
      const nextPoster = normalizeStoredAssetPath(row.video_poster_url)
      const nextAuthorAvatar = normalizeStoredAssetPath(row.author_avatar_url)

      const changed = nextImage !== (row.image_url || '')
        || JSON.stringify(nextImages) !== JSON.stringify(Array.isArray(row.images) ? row.images : [])
        || nextVideo !== (row.video_url || '')
        || nextPoster !== (row.video_poster_url || '')
        || nextAuthorAvatar !== (row.author_avatar_url || '')

      if (!changed) {
        continue
      }

      await client.query(
        `
          UPDATE guides
          SET image_url = $1,
              images = $2,
              video_url = $3,
              video_poster_url = $4,
              author_avatar_url = $5
          WHERE id = $6
        `,
        [nextImage, nextImages, nextVideo, nextPoster, nextAuthorAvatar, row.id]
      )

      updated += 1
      console.log(`updated ${row.slug}`)
    }

    console.log(`done: ${updated} guide rows updated`)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
