require('dotenv').config();
const { insertSale } = require('../src/lib/sales-service');
const { scrapeTikTokShop } = require('../src/lib/tiktok-scraper');

// Interval dalam milliseconds (default 5 menit = 300000 ms)
const INTERVAL_MS = Number(process.env.TIKTOK_SCRAPE_INTERVAL) || 300000;

// Cache untuk track last sync dan error handling
let lastSyncTime = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

async function fetchAndInsertData() {
  try {
    const startTime = Date.now();
    console.log(`\n[${new Date().toISOString()}] 🔄 Fetching data dari TikTok Public...`);

    // Scrape data dari TikTok
    const products = await scrapeTikTokShop();

    if (!products || products.length === 0) {
      console.warn('[WARNING] Tidak ada produk yang ditemukan');
      return;
    }

    console.log(`[${new Date().toISOString()}] 📦 Found ${products.length} products`);

    // Insert ke database
    let insertedCount = 0;
    for (const product of products) {
      try {
        await insertSale({
          product_name: product.product_name,
          sold_count: product.sold_count,
          source_url: product.source_url || null,
        });
        insertedCount++;
      } catch (err) {
        console.error(`Failed to insert ${product.product_name}:`, err.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[${new Date().toISOString()}] ✅ Inserted ${insertedCount}/${products.length} products (${duration}s)`
    );

    lastSyncTime = new Date();
    consecutiveErrors = 0;
  } catch (error) {
    consecutiveErrors++;
    console.error(
      `[${new Date().toISOString()}] ❌ Error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
      error.message
    );

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `[ERROR] Terlalu banyak error berturut-turut. Hentikan scraper untuk investigasi manual.`
      );
      process.exit(1);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Affiliate Realtime Trending Scraper - TikTok Public Mode');
  console.log('='.repeat(60));
  console.log(`Interval: ${(INTERVAL_MS / 1000 / 60).toFixed(1)} menit`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  // Jalankan pertama kali langsung
  await fetchAndInsertData();

  // Jalankan setiap interval
  setInterval(fetchAndInsertData, INTERVAL_MS);

  console.log(
    `📅 Next sync in ${(INTERVAL_MS / 1000 / 60).toFixed(1)} minutes...`
  );
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down gracefully...');
  if (lastSyncTime) {
    console.log(`Last successful sync: ${lastSyncTime.toISOString()}`);
  }
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
