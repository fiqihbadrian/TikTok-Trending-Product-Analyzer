require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const { DB_HOST, DB_PORT = '3306', DB_USER, DB_PASSWORD = '', DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('DB_HOST, DB_USER, dan DB_NAME wajib diisi di file .env');
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.query(`USE \`${DB_NAME}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        sold_count INT NOT NULL,
        source_url TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_product_name (product_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      ALTER TABLE sales
      ADD COLUMN IF NOT EXISTS source_url TEXT NULL
    `);

    console.log('Database dan tabel sales berhasil disiapkan.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Gagal inisialisasi database:', error.message);
  process.exit(1);
});
