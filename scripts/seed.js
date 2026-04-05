require('dotenv').config();
const { insertSale } = require('../src/lib/sales-service');

const PRODUCTS = [
  'Wireless Earbuds Pro',
  'Smart Bottle 1L',
  'Gaming Mouse X7',
  'Laptop Stand Foldable',
  'Ring Light 12 Inch',
  'Mechanical Keyboard Mini',
  'Phone Holder MagSafe',
  'Portable Blender Go',
  'Webcam Full HD',
  'Desk Mat XL',
  'USB-C Hub 7 in 1',
  'Power Bank 20K',
  'Action Cam Lite',
  'Bluetooth Speaker Mini',
];

const SPIKE_PRODUCTS = [
  'Ring Light 12 Inch',
  'Wireless Earbuds Pro',
  'Portable Blender Go',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomProduct() {
  return PRODUCTS[randomInt(0, PRODUCTS.length - 1)];
}

function randomDateThisMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = randomInt(1, now.getDate());
  const hour = randomInt(0, 23);
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);

  return new Date(year, month, day, hour, minute, second);
}

function toMySqlDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function main() {
  const now = new Date();
  const baseCount = 90;

  for (let i = 0; i < baseCount; i += 1) {
    const createdAt = randomDateThisMonth();
    const soldCount = randomInt(2, 22);

    await insertSale({
      product_name: randomProduct(),
      sold_count: soldCount,
      created_at: toMySqlDateTime(createdAt),
    });
  }

  // Tambahkan pola kemarin yang lebih rendah untuk produk spike.
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 1),
    randomInt(9, 20),
    randomInt(0, 59),
    randomInt(0, 59)
  );

  for (const product of SPIKE_PRODUCTS) {
    for (let i = 0; i < 4; i += 1) {
      await insertSale({
        product_name: product,
        sold_count: randomInt(1, 5),
        created_at: toMySqlDateTime(yesterday),
      });
    }
  }

  // Buat lonjakan besar hari ini agar growth terlihat jelas.
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    randomInt(10, 22),
    randomInt(0, 59),
    randomInt(0, 59)
  );

  for (const product of SPIKE_PRODUCTS) {
    for (let i = 0; i < 10; i += 1) {
      await insertSale({
        product_name: product,
        sold_count: randomInt(10, 25),
        created_at: toMySqlDateTime(today),
      });
    }
  }

  // Tambahkan sebagian produk dengan performa menurun agar variasi trend naik/turun ada.
  const slowdownProducts = ['Desk Mat XL', 'Action Cam Lite'];
  for (const product of slowdownProducts) {
    for (let i = 0; i < 8; i += 1) {
      await insertSale({
        product_name: product,
        sold_count: randomInt(8, 18),
        created_at: toMySqlDateTime(yesterday),
      });
    }

    for (let i = 0; i < 2; i += 1) {
      await insertSale({
        product_name: product,
        sold_count: randomInt(1, 4),
        created_at: toMySqlDateTime(today),
      });
    }
  }

  console.log('Seed selesai. Data variasi naik/turun dan lonjakan hari ini berhasil ditambahkan.');
}

main().catch((error) => {
  console.error('Seed gagal:', error.message);
  process.exit(1);
});
