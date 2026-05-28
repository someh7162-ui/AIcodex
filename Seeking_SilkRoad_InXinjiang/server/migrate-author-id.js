const { Pool } = require('pg')
const { db } = require('./config')

const pool = new Pool(db)

async function run() {
  await pool.query(`
    ALTER TABLE guides
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL
  `)
  console.log('author_id column added (or already exists)')
  await pool.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
