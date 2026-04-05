const db = require('./db');
const { getTikTokProducts, getTrendingProducts } = require('./tiktok');
const { addCategory } = require('./product-category');

async function getTopProductsThisMonth(limit = 10) {
  const hasSourceUrl = await db.hasColumn('sales', 'source_url');
  const sourceUrlSelect = hasSourceUrl ? 'sales.source_url' : 'NULL AS source_url';

  const sql = `
    WITH ranked AS (
      SELECT
        product_name,
        SUM(sold_count) AS total_sold,
        MAX(created_at) AS last_seen_at
      FROM sales
      WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      GROUP BY product_name
      ORDER BY total_sold DESC
      LIMIT ?
    )
    SELECT
      ranked.product_name,
      ranked.total_sold,
      ${sourceUrlSelect}
    FROM ranked
    LEFT JOIN sales
      ON sales.product_name = ranked.product_name
      AND sales.created_at = ranked.last_seen_at
    ORDER BY ranked.total_sold DESC
  `;

  const [rows] = await db.query(sql, [limit]);
  return rows.map((row) => addCategory(row));
}

async function insertSale({ product_name, sold_count, created_at = null, source_url = null }) {
  const hasSourceUrl = await db.hasColumn('sales', 'source_url');

  if (hasSourceUrl) {
    const sql = `
      INSERT INTO sales (product_name, sold_count, created_at, source_url)
      VALUES (?, ?, COALESCE(?, NOW()), ?)
    `;

    const [result] = await db.query(sql, [product_name, sold_count, created_at, source_url]);
    return result;
  }

  const sql = `
    INSERT INTO sales (product_name, sold_count, created_at)
    VALUES (?, ?, COALESCE(?, NOW()))
  `;

  const [result] = await db.query(sql, [product_name, sold_count, created_at]);
  return result;
}

async function insertRandomSaleFromTikTok() {
  const trendingCandidates = getTrendingProducts();
  const useTrending = Math.random() > 0.25;

  if (useTrending && trendingCandidates.length > 0) {
    const pick = trendingCandidates[Math.floor(Math.random() * trendingCandidates.length)];
    return insertSale({
      product_name: pick.product_name,
      sold_count: Math.max(1, Math.floor(pick.sold_count / 5)),
    });
  }

  const payload = getTikTokProducts();
  return insertSale(payload);
}

async function getTrendingProductsGrowth(limit = 10) {
  const hasSourceUrl = await db.hasColumn('sales', 'source_url');
  const sourceUrlSelect = hasSourceUrl ? 'sales.source_url' : 'NULL AS source_url';

  const sql = `
    WITH ranked AS (
      SELECT
        product_name,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN sold_count ELSE 0 END) AS today_sales,
        SUM(CASE WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN sold_count ELSE 0 END) AS yesterday_sales,
        MAX(created_at) AS last_seen_at
      FROM sales
      WHERE DATE(created_at) IN (CURDATE(), DATE_SUB(CURDATE(), INTERVAL 1 DAY))
      GROUP BY product_name
      HAVING today_sales > 0 OR yesterday_sales > 0
    )
    SELECT
      ranked.product_name,
      ranked.today_sales,
      ranked.yesterday_sales,
      ${sourceUrlSelect}
    FROM ranked
    LEFT JOIN sales
      ON sales.product_name = ranked.product_name
      AND sales.created_at = ranked.last_seen_at
  `;

  const [rows] = await db.query(sql);

  return rows
    .map((row) => {
      const todaySales = Number(row.today_sales || 0);
      const yesterdaySales = Number(row.yesterday_sales || 0);
      let growthPercentage = 0;
      let growthLabel = 'normal';
      let trendScore = 0;

      if (yesterdaySales === 0 && todaySales > 0) {
        growthPercentage = null;
        growthLabel = 'new';
        trendScore = todaySales;
      } else if (yesterdaySales > 0) {
        growthPercentage = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
        trendScore = growthPercentage;
      }

      return {
        product_name: row.product_name,
        today_sales: todaySales,
        yesterday_sales: yesterdaySales,
        growth_percentage:
          growthPercentage === null ? null : Number(growthPercentage.toFixed(2)),
        growth_label: growthLabel,
        trend_score: Number(trendScore.toFixed(2)),
        source_url: row.source_url || null,
      };
    })
    .map((row) => addCategory(row))
    .sort((a, b) => b.trend_score - a.trend_score)
    .slice(0, limit);
}

async function getProductDailySales(productName, days = 30) {
  const sql = `
    SELECT
      DATE(created_at) AS sale_date,
      SUM(sold_count) AS total_sold
    FROM sales
    WHERE product_name = ?
      AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;

  const [rows] = await db.query(sql, [productName, days]);

  const rowMap = new Map(
    rows.map((row) => [new Date(row.sale_date).toISOString().slice(0, 10), Number(row.total_sold || 0)])
  );

  const series = [];
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const currentDate = new Date(endDate);
    currentDate.setDate(endDate.getDate() - offset);
    const key = currentDate.toISOString().slice(0, 10);

    series.push({
      sale_date: key,
      total_sold: rowMap.get(key) || 0,
    });
  }

  return series;
}

async function searchProductThisMonth(searchQuery) {
  const hasSourceUrl = await db.hasColumn('sales', 'source_url');
  const sourceUrlSelect = hasSourceUrl ? 'sales.source_url' : 'NULL AS source_url';

  const sql = `
    WITH ranked AS (
      SELECT
        product_name,
        SUM(sold_count) AS total_sold,
        MIN(created_at) AS first_sale,
        MAX(created_at) AS last_sale
      FROM sales
      WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        AND product_name LIKE ?
      GROUP BY product_name
      ORDER BY total_sold DESC
    )
    SELECT
      ranked.product_name,
      ranked.total_sold,
      ranked.first_sale,
      ranked.last_sale,
      ${sourceUrlSelect}
    FROM ranked
    LEFT JOIN sales
      ON sales.product_name = ranked.product_name
      AND sales.created_at = ranked.last_sale
    ORDER BY ranked.total_sold DESC
  `;

  const searchTerm = `%${searchQuery}%`;
  const [rows] = await db.query(sql, [searchTerm]);

  return rows
    .map((row) => ({
      product_name: row.product_name,
      total_sold: Number(row.total_sold || 0),
      first_sale: row.first_sale,
      last_sale: row.last_sale,
      source_url: row.source_url || null,
    }))
    .map((row) => addCategory(row));
}

module.exports = {
  getTopProductsThisMonth,
  insertSale,
  insertRandomSaleFromTikTok,
  getTrendingProductsGrowth,
  getProductDailySales,
  searchProductThisMonth,
};
