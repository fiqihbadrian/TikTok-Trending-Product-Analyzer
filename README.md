# TikTok Trending Product Analyzer

Dashboard untuk memonitor produk affiliate yang sedang naik berdasarkan sinyal data publik TikTok.

## Stack

- Next.js 14 (App Router)
- React 18
- MySQL 8 (`mysql2`)
- Chart.js (`react-chartjs-2`)
- Playwright (public scraping)

## Core Behavior

- Data scraper masuk ke tabel `sales` sebagai snapshot periodik.
- List trending dan chart utama menggunakan metrik yang sinkron (`trend_score`).
- Produk baru tanpa data kemarin ditandai `NEW` (bukan dipaksa `100%`).
- Link video sumber ditampilkan jika `source_url` tersedia.

## Metric Definition

- `today_sales`: total skor hari ini untuk produk.
- `yesterday_sales`: total skor kemarin untuk produk.
- `growth_percentage`: persen perubahan harian jika data kemarin tersedia.
- `growth_label = new`: produk baru, belum ada baseline kemarin.
- `trend_score`: skor ranking untuk menyusun urutan trending.

## Project Structure

```txt
app/
  api/
    health/route.js
    top-month/route.js
    trending/route.js
    product-search/route.js
    product/[name]/route.js
  globals.css
  layout.js
  page.js
components/
  SalesChart.js
  SearchBar.js
  SearchResults.js
  ThemeSwitcher.js
lib/
  db.js
  sales-service.js
  tiktok-scraper.js
  product-category.js
scripts/
  init-db.js
  seed.js
  realtime-simulator.js
  tiktok-realtime.js
```

## Environment

Gunakan file `.env` dengan nilai minimum berikut.

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=affiliate_trending_dashboard

TIKTOK_SCRAPE_MODE=public
TIKTOK_PUBLIC_URLS=https://www.tiktok.com/tag/tiktokshop,https://www.tiktok.com/discover/tiktok-shop
TIKTOK_PUBLIC_KEYWORDS=sepatu,tas,baju,kemeja,celana,hijab,jaket,sandal,dress,skincare
TIKTOK_PUBLIC_KEYWORD_LIMIT=6
TIKTOK_PUBLIC_MAX_ITEMS=20
TIKTOK_HEADLESS=true
TIKTOK_SCRAPE_INTERVAL=300000
```

## Setup

```bash
npm install
npm run db:init
```

`db:init` akan membuat tabel `sales` dan menambahkan kolom `source_url` jika belum ada.

## Run

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run tiktok:realtime
```

Opsional untuk data dummy:

```bash
npm run seed
npm run simulate
```

## API

- `GET /api/health`
- `GET /api/top-month`
- `GET /api/trending`
- `GET /api/product-search?q=<keyword>`
- `GET /api/product/<product_name>`

## NPM Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:init`
- `npm run seed`
- `npm run simulate`
- `npm run tiktok:realtime`
- `npm run tiktok:login`