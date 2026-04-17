const path = require('path')
const { pathToFileURL } = require('url')
const db = require('./db')

async function loadDestinationModule() {
  const moduleUrl = pathToFileURL(path.join(__dirname, '../common/destination-data.js')).href
  return import(moduleUrl)
}

async function run() {
  const {
    destinationList,
    getDestinationCulture,
    getDestinationTravelMeta,
    getDestinationVisitMeta,
  } = await loadDestinationModule()

  const client = await db.pool.connect()

  try {
    await client.query('BEGIN')

    for (const item of destinationList) {
      const culture = getDestinationCulture(item.id) || {}
      const travelMeta = getDestinationTravelMeta(item.id) || {}
      const visitMeta = getDestinationVisitMeta(item.id) || {}

      await client.query(
        `
          INSERT INTO destinations (
            id,
            name,
            location,
            region,
            category,
            rating,
            longitude,
            latitude,
            description,
            image_url,
            weather,
            tips,
            suggestion,
            live_title,
            live_hint,
            live_keyword,
            culture_overview,
            culture_history,
            culture_highlights,
            recommended_season,
            recommended_stay,
            suitable_audience,
            ticket_reference,
            open_hours,
            sort_order,
            status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11::jsonb, $12::text[], $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, 'published'
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            location = EXCLUDED.location,
            region = EXCLUDED.region,
            category = EXCLUDED.category,
            rating = EXCLUDED.rating,
            longitude = EXCLUDED.longitude,
            latitude = EXCLUDED.latitude,
            description = EXCLUDED.description,
            image_url = EXCLUDED.image_url,
            weather = EXCLUDED.weather,
            tips = EXCLUDED.tips,
            suggestion = EXCLUDED.suggestion,
            live_title = EXCLUDED.live_title,
            live_hint = EXCLUDED.live_hint,
            live_keyword = EXCLUDED.live_keyword,
            culture_overview = EXCLUDED.culture_overview,
            culture_history = EXCLUDED.culture_history,
            culture_highlights = EXCLUDED.culture_highlights,
            recommended_season = EXCLUDED.recommended_season,
            recommended_stay = EXCLUDED.recommended_stay,
            suitable_audience = EXCLUDED.suitable_audience,
            ticket_reference = EXCLUDED.ticket_reference,
            open_hours = EXCLUDED.open_hours,
            sort_order = EXCLUDED.sort_order,
            status = EXCLUDED.status,
            updated_at = NOW()
        `,
        [
          item.id,
          item.name,
          item.location,
          item.region,
          item.category,
          item.rating ? Number(item.rating) : null,
          item.coordinates?.longitude ?? null,
          item.coordinates?.latitude ?? null,
          item.description,
          item.image || '',
          JSON.stringify(item.weather || {}),
          item.tips || [],
          item.suggestion || '',
          item.liveTitle || '',
          item.liveHint || '',
          item.liveKeyword || '',
          culture.overview || '',
          culture.history || '',
          culture.highlights || '',
          travelMeta.season || '',
          travelMeta.stay || '',
          travelMeta.audience || '',
          visitMeta.ticket || '',
          visitMeta.openHours || '',
          item.id,
        ]
      )
    }

    await client.query('COMMIT')
    console.log(`Synced ${destinationList.length} destinations.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await db.pool.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
