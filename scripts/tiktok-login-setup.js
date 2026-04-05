require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DEFAULT_STORAGE_STATE_PATH = path.join(
  process.cwd(),
  '.auth',
  'tiktok-storage-state.json'
);

async function main() {
  const storageStatePath =
    process.env.TIKTOK_STORAGE_STATE || DEFAULT_STORAGE_STATE_PATH;

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  console.log('Membuka halaman login TikTok Seller...');
  await page.goto('https://seller.tiktok.com', { waitUntil: 'domcontentloaded' });

  console.log('Silakan login manual (termasuk Login with Google jika kamu pakai itu).');
  console.log('Setelah masuk dashboard, tekan ENTER di terminal ini untuk simpan session.');

  await waitForEnter();

  const dirPath = path.dirname(storageStatePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  await context.storageState({ path: storageStatePath });

  console.log(`Session berhasil disimpan ke: ${storageStatePath}`);
  console.log('Sekarang kamu bisa jalankan: npm run tiktok:realtime');

  await browser.close();
}

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

main().catch((err) => {
  console.error('Setup login gagal:', err.message);
  process.exit(1);
});
