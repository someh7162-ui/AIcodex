const fs = require('fs')
const path = require('path')
const db = require('./db')

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../docs/postgresql-hiking-tracks-migration.sql'), 'utf8')
  await db.query(sql)
  console.log('hiking tracks migration applied')
  await db.pool.end()
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
