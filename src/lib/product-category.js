const CATEGORY_RULES = [
  {
    category: 'Sepatu',
    keywords: ['sepatu', 'sneakers', 'sandal', 'heels', 'flatshoes', 'loafer'],
  },
  {
    category: 'Tas',
    keywords: ['tas', 'bag', 'backpack', 'sling bag', 'totebag', 'tote bag', 'pouch'],
  },
  {
    category: 'Pakaian',
    keywords: [
      'baju',
      'kemeja',
      'celana',
      'dress',
      'jaket',
      'kaos',
      'blouse',
      'rok',
      'hoodie',
      'cardigan',
      'gamis',
      'kebaya',
    ],
  },
  {
    category: 'Hijab',
    keywords: ['hijab', 'jilbab', 'pashmina', 'khimar', 'bergo', 'inner hijab'],
  },
  {
    category: 'Kecantikan',
    keywords: [
      'skincare',
      'serum',
      'moisturizer',
      'cleanser',
      'sunscreen',
      'lipstick',
      'makeup',
      'foundation',
      'maskara',
      'parfum',
    ],
  },
  {
    category: 'Aksesoris',
    keywords: ['jam', 'kalung', 'gelang', 'cincin', 'earring', 'kacamata', 'topi', 'belt'],
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function categorizeProductName(productName) {
  const normalized = normalizeText(productName);

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return 'Lainnya';
}

function addCategory(row) {
  return {
    ...row,
    category: categorizeProductName(row.product_name),
  };
}

function summarizeByCategory(rows, metricKey) {
  const summary = new Map();

  for (const row of rows) {
    const category = row.category || categorizeProductName(row.product_name);
    const metric = Number(row[metricKey] || 0);
    const current = summary.get(category) || {
      category,
      total: 0,
      products: 0,
    };

    summary.set(category, {
      category,
      total: current.total + metric,
      products: current.products + 1,
    });
  }

  return Array.from(summary.values()).sort((a, b) => b.total - a.total);
}

module.exports = {
  CATEGORY_RULES,
  categorizeProductName,
  addCategory,
  summarizeByCategory,
};
