const mysql = require('mysql2/promise');

const globalForDb = global;

function assertRequiredEnv() {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];

  for (const key of requiredVars) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

function getPool() {
  if (!globalForDb.__mysqlPool) {
    assertRequiredEnv();

    globalForDb.__mysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return globalForDb.__mysqlPool;
}

async function query(sql, params) {
  const pool = getPool();
  return pool.query(sql, params);
}

async function hasColumn(tableName, columnName) {
  if (!globalForDb.__schemaColumnCache) {
    globalForDb.__schemaColumnCache = new Map();
  }

  const cacheKey = `${tableName}.${columnName}`;
  if (globalForDb.__schemaColumnCache.has(cacheKey)) {
    return globalForDb.__schemaColumnCache.get(cacheKey);
  }

  const [rows] = await query(
    `
      SELECT COUNT(*) AS column_count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  const exists = Number(rows?.[0]?.column_count || 0) > 0;
  globalForDb.__schemaColumnCache.set(cacheKey, exists);
  return exists;
}

module.exports = {
  getPool,
  query,
  hasColumn,
};
