function getRequiredEnv(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getNumberEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? value : fallback
}

module.exports = {
  port: getNumberEnv('PORT', 3000),
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  ai: {
    baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.AI_MODEL || 'qwen3.6-plus',
    apiKey: process.env.AI_API_KEY || '',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: getNumberEnv('DB_PORT', 5432),
    user: process.env.DB_USER || 'postgres',
    password: getRequiredEnv('DB_PASSWORD'),
    database: process.env.DB_NAME || 'mydb',
    max: getNumberEnv('DB_MAX', 10),
    idleTimeoutMillis: getNumberEnv('DB_IDLE_TIMEOUT_MS', 30000),
    connectionTimeoutMillis: getNumberEnv('DB_CONNECTION_TIMEOUT_MS', 10000),
  },
}
