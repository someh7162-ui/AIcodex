const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'mydb',
})

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '../docs/postgresql-app-schema.sql'), 'utf8')
  const seed = fs.readFileSync(path.join(__dirname, '../docs/postgresql-app-seed.sql'), 'utf8')

  console.log('Running schema...')
  await pool.query(schema)
  console.log('Schema OK')

  console.log('Clearing existing data...')
  await pool.query('TRUNCATE guides, guide_sections, destinations, user_hiking_tracks CASCADE')
  console.log('Running seed...')
  await pool.query(seed)
  console.log('Seed OK')

  await pool.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
