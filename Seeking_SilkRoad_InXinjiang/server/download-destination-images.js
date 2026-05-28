const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { pathToFileURL } = require('url')

const destinationDataPath = path.join(__dirname, '../common/destination-data.js')
const outputDir = path.join(__dirname, '../uploads/destinations')

ensureDir(outputDir)

async function loadDestinationModule() {
  const moduleUrl = pathToFileURL(destinationDataPath).href
  return import(moduleUrl)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'destination'
}

function inferExtension(url, contentType = '') {
  const cleanUrl = String(url || '').split('?')[0]
  const ext = path.extname(cleanUrl).toLowerCase()
  if (ext && ext.length <= 5) {
    return ext
  }

  if (/png/i.test(contentType)) return '.png'
  if (/webp/i.test(contentType)) return '.webp'
  if (/gif/i.test(contentType)) return '.gif'
  return '.jpg'
}

async function download(url, destBasePath) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const ext = inferExtension(response.url || url, response.headers.get('content-type') || '')
    const finalPath = `${destBasePath}${ext}`
    const arrayBuffer = await response.arrayBuffer()
    fs.writeFileSync(finalPath, Buffer.from(arrayBuffer))
    return { finalPath, ext }
  } catch (error) {
    if (process.platform !== 'win32') {
      throw error
    }

    return downloadWithPowerShell(url, destBasePath)
  }
}

function downloadWithPowerShell(url, destBasePath) {
  const ext = inferExtension(url)
  const finalPath = `${destBasePath}${ext}`
  const command = [
    "$ProgressPreference = 'SilentlyContinue'",
    `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12`,
    `Invoke-WebRequest -Uri '${String(url).replace(/'/g, "''")}' -OutFile '${finalPath.replace(/'/g, "''")}'`,
  ].join('; ')

  const result = spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'pipe' })
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || Buffer.from('PowerShell download failed')).toString().trim())
  }

  return { finalPath, ext }
}

async function run() {
  const { destinationList } = await loadDestinationModule()
  let source = fs.readFileSync(destinationDataPath, 'utf8')
  const seen = new Set()

  for (const item of destinationList) {
    const remoteUrl = String(item.image || '')
    if (!remoteUrl || remoteUrl.startsWith('/uploads/') || seen.has(remoteUrl)) {
      continue
    }

    seen.add(remoteUrl)
    const fileBaseName = `${String(item.id).padStart(2, '0')}-${slugify(item.name)}`
    const destBasePath = path.join(outputDir, fileBaseName)

    try {
      console.log(`Downloading ${item.id} ${item.name}`)
      const { finalPath } = await download(remoteUrl, destBasePath)
      const localUrl = `/uploads/destinations/${path.basename(finalPath)}`
      source = source.split(remoteUrl).join(localUrl)
      console.log(`  OK -> ${localUrl}`)
    } catch (error) {
      console.error(`  FAIL ${item.id} ${item.name}: ${error.message}`)
    }
  }

  fs.writeFileSync(destinationDataPath, source)
  console.log('Updated destination image URLs in common/destination-data.js')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
