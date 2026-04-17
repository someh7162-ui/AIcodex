module.exports = {
  port: 3000,
  jwtSecret: 'meet-xinjiang-api-dev-secret',
  db: {
    host: '111.20.31.227',
    port: 28856,
    user: 'postgres',
    password: '123456',
    database: 'mydb',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
}
