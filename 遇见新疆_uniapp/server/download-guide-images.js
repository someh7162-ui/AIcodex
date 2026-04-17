const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '123456', database: 'mydb' })

const images = [
  { slug: 'first-time-xinjiang',  url: 'https://picsum.photos/seed/xinjiang1/800/500', file: 'first-time-xinjiang.jpg' },
  { slug: 'self-drive-checklist', url: 'https://picsum.photos/seed/xinjiang2/800/500', file: 'self-drive-checklist.jpg' },
  { slug: 'food-guide',           url: 'https://picsum.photos/seed/xinjiang3/800/500', file: 'food-guide.jpg' },
  { slug: 'desert-safety',        url: 'https://picsum.photos/seed/xinjiang4/800/500', file: 'desert-safety.jpg' },
  { slug: 'tianshan-hiking',      url: 'https://picsum.photos/seed/xinjiang5/800/500', file: 'tianshan-hiking.jpg' },
  { slug: 'stay-where',           url: 'https://picsum.photos/seed/xinjiang6/800/500', file: 'stay-where.jpg' },
]

const dir = path.join(__dirname, '../uploads/guides')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { file.close(); return reject(new Error(`HTTP ${res.statusCode}`)) }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    })
    req.on('error', reject)
  })
}

async function run() {
  for (const img of images) {
    const dest = path.join(dir, img.file)
    const localUrl = `/uploads/guides/${img.file}`
    try {
      console.log(`Downloading ${img.slug}...`)
      await download(img.url, dest)
      await pool.query('UPDATE guides SET image_url = $1 WHERE slug = $2', [localUrl, img.slug])
      console.log(`  OK → ${localUrl}`)
    } catch (e) {
      console.error(`  FAIL ${img.slug}: ${e.message}`)
    }
  }
  await pool.end()
}

run()
