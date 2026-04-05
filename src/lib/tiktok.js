const PRODUCT_NAMES = [
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

const TRENDING_BASE = [
  { product_name: 'Wireless Earbuds Pro', sold_count: 38 },
  { product_name: 'Ring Light 12 Inch', sold_count: 44 },
  { product_name: 'Portable Blender Go', sold_count: 29 },
  { product_name: 'Phone Holder MagSafe', sold_count: 25 },
  { product_name: 'Power Bank 20K', sold_count: 33 },
  { product_name: 'Webcam Full HD', sold_count: 21 },
  { product_name: 'USB-C Hub 7 in 1', sold_count: 27 },
  { product_name: 'Bluetooth Speaker Mini', sold_count: 23 },
  { product_name: 'Gaming Mouse X7', sold_count: 19 },
  { product_name: 'Mechanical Keyboard Mini', sold_count: 17 },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomProduct() {
  return PRODUCT_NAMES[getRandomInt(0, PRODUCT_NAMES.length - 1)];
}

function getTikTokProducts() {
  return {
    product_name: pickRandomProduct(),
    sold_count: getRandomInt(1, 25),
  };
}

function getTrendingProducts() {
  return TRENDING_BASE.map((item, index) => {
    const spikeBoost = index < 2 ? getRandomInt(8, 22) : getRandomInt(-6, 10);
    return {
      product_name: item.product_name,
      sold_count: Math.max(1, item.sold_count + spikeBoost),
    };
  });
}

/*
  Cara mengganti function ini dengan data real:

  1) Scraping (Playwright)
  - Install playwright lalu login ke TikTok Shop Seller Center.
  - Navigasi ke halaman produk/order, ekstrak nama produk + jumlah terjual.
  - Return object dengan format yang sama: { product_name, sold_count }.
  - Pastikan patuh ToS TikTok dan regulasi scraping yang berlaku.

  2) API TikTok (jika tersedia untuk akun Anda)
  - Gunakan official access token dan endpoint analytics/order.
  - Mapping response API ke format: { product_name, sold_count }.
  - Tambahkan retry, rate-limit handling, dan token refresh.

  Contoh scraping detail pakai Playwright:
  - Buka halaman daftar produk TikTok Shop Seller Center.
  - Ambil nama produk dengan selector seperti:
    [data-e2e="product-name"], .product-card__name, .index_productName
  - Ambil jumlah terjual dengan selector seperti:
    [data-e2e="product-sold"], .product-card__sold, .index_soldCount
  - Bersihkan teks (hapus kata "terjual" atau simbol lain), parse jadi angka,
    lalu return ke format { product_name, sold_count }.
*/

module.exports = {
  getTikTokProducts,
  getTrendingProducts,
};
