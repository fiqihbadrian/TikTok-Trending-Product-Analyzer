const { chromium } = require('playwright');

const DEFAULT_PUBLIC_URLS = [
  'https://www.tiktok.com/tag/tiktokshop',
  'https://www.tiktok.com/discover/tiktok-shop',
];

const DEFAULT_PRODUCT_KEYWORDS = [
  'sepatu',
  'tas',
  'baju',
  'kemeja',
  'celana',
  'hijab',
  'jaket',
  'sandal',
  'dress',
  'skincare',
];

/**
 * Scrape sinyal tren produk dari halaman publik TikTok (tanpa login).
 * Catatan: ini bukan data seller resmi, jadi metrik dipakai sebagai proxy tren.
 */
async function scrapeTikTokShop() {
  let browser;

  try {
    const maxItems = Number(process.env.TIKTOK_PUBLIC_MAX_ITEMS) || 20;
    const keywordLimit = Number(process.env.TIKTOK_PUBLIC_KEYWORD_LIMIT) || 6;
    const publicUrls = (process.env.TIKTOK_PUBLIC_URLS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const productKeywords = (process.env.TIKTOK_PUBLIC_KEYWORDS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const activeKeywords =
      productKeywords.length > 0 ? productKeywords : DEFAULT_PRODUCT_KEYWORDS;

    const targetUrls = buildTargetUrls({
      publicUrls,
      keywords: activeKeywords,
      keywordLimit,
    });

    browser = await chromium.launch({
      headless: process.env.TIKTOK_HEADLESS !== 'false',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    const allSignals = [];
    for (const url of targetUrls) {
      console.log(`Opening public page: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const pageSignals = await extractPublicSignals(page, {
        maxItems,
        productKeywords: activeKeywords,
      });
      console.log(`Found ${pageSignals.length} signals from ${url}`);
      allSignals.push(...pageSignals);
    }

    const deduped = dedupeSignals(allSignals).slice(0, maxItems);
    await context.close();
    await browser.close();

    if (deduped.length === 0) {
      throw new Error(
        'Tidak ada data publik yang bisa diekstrak. Coba ganti TIKTOK_PUBLIC_URLS atau set TIKTOK_HEADLESS=false untuk debug.'
      );
    }

    return deduped.map((item) => ({
      product_name: item.name,
      sold_count: item.metric,
      source_url: item.source_url || null,
    }));
  } catch (error) {
    console.error('Scraping error:', error.message);

    if (browser) {
      await browser.close();
    }

    throw error;
  }
}

async function extractPublicSignals(page, options) {
  return page.evaluate(({ localMaxItems, localKeywords }) => {
    const parseCompactNumber = (text) => {
      const normalized = String(text || '')
        .replace(/,/g, '')
        .trim();
      const match = normalized.match(/(\d+(?:\.\d+)?)(\s*[KMB])?/i);
      if (!match) {
        return 0;
      }

      const base = Number(match[1]);
      const unit = (match[2] || '').trim().toUpperCase();
      if (unit === 'K') {
        return Math.round(base * 1000);
      }
      if (unit === 'M') {
        return Math.round(base * 1000000);
      }
      if (unit === 'B') {
        return Math.round(base * 1000000000);
      }
      return Math.round(base);
    };

    const toLower = (text) => String(text || '').toLowerCase();

    const containsProductKeyword = (text) => {
      const haystack = toLower(text);
      return localKeywords.some((keyword) => haystack.includes(keyword));
    };

    const cleanName = (text) =>
      String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/#[^\s]+/g, '')
        .replace(/(shop now|promo|diskon|gratis ongkir)/gi, '')
        .trim();

    const buildCandidateName = (rawText) => {
      const compact = cleanName(rawText);
      if (!compact) {
        return '';
      }

      const segments = compact.split(/[.!?\n]/).map((item) => item.trim()).filter(Boolean);
      const best = segments.find((segment) => containsProductKeyword(segment)) || compact;

      return best.split(' ').slice(0, 9).join(' ').slice(0, 90).trim();
    };

    const selectors = [
      'a[href*="/video/"]',
      'div[data-e2e*="search-card"]',
      'div[data-e2e*="challenge"]',
      'div[data-e2e*="feed-item"]',
      'article',
    ];

    const pool = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => pool.push(el));
    });

    const seen = new Set();
    const rows = [];

    for (const el of pool) {
      const rawText = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!rawText || rawText.length < 8) {
        continue;
      }

      const key = rawText.slice(0, 120);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      if (!containsProductKeyword(rawText)) {
        continue;
      }

      const name = buildCandidateName(rawText);
      if (!name) {
        continue;
      }

      if (!containsProductKeyword(name)) {
        continue;
      }

      const metricCandidates = rawText.match(/\d+(?:\.\d+)?\s*[KMB]?/gi) || [];
      const metric = Math.max(
        ...metricCandidates.map((candidate) => parseCompactNumber(candidate)),
        0
      );

      const hrefCandidate =
        el.href ||
        el.querySelector('a[href*="/video/"]')?.href ||
        el.closest('a[href*="/video/"]')?.href ||
        null;

      const sourceUrl = hrefCandidate
        ? new URL(hrefCandidate, window.location.origin).href
        : null;

      if (metric > 0) {
        rows.push({ name, metric, source_url: sourceUrl });
      }
    }

    return rows
      .sort((a, b) => b.metric - a.metric)
      .slice(0, localMaxItems);
  }, {
    localMaxItems: options.maxItems,
    localKeywords: options.productKeywords,
  });
}

function buildTargetUrls({ publicUrls, keywords, keywordLimit }) {
  const urls = [];

  if (publicUrls.length > 0) {
    urls.push(...publicUrls);
  } else {
    urls.push(...DEFAULT_PUBLIC_URLS);
  }

  for (const keyword of keywords.slice(0, keywordLimit)) {
    const query = encodeURIComponent(`${keyword} tiktok shop`);
    urls.push(`https://www.tiktok.com/search?q=${query}`);
  }

  return Array.from(new Set(urls));
}

function dedupeSignals(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.name.toLowerCase();
    const current = map.get(key);
    if (!current || item.metric > current.metric) {
      map.set(key, item);
    } else if (!current.source_url && item.source_url) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.metric - a.metric);
}

module.exports = {
  scrapeTikTokShop,
};
