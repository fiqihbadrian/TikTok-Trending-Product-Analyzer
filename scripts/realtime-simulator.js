require('dotenv').config();
const { insertRandomSaleFromTikTok } = require('../src/lib/sales-service');

const INTERVAL_MS = 10000;

async function pushOneRecord() {
  try {
    const result = await insertRandomSaleFromTikTok();
    console.log(`[${new Date().toISOString()}] Inserted sales row id=${result.insertId}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed insert:`, error.message);
  }
}

async function main() {
  console.log('Realtime simulator berjalan. Insert data setiap 10 detik...');
  await pushOneRecord();
  setInterval(pushOneRecord, INTERVAL_MS);
}

main();
