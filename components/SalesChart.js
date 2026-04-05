'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

async function fetchTopMonth() {
  const response = await fetch('/api/top-month', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch /api/top-month');
  }

  const payload = await response.json();
  return payload.data || [];
}

async function fetchTrending() {
  const response = await fetch('/api/trending', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch /api/trending');
  }

  const payload = await response.json();
  return payload.data || [];
}

async function fetchProductDetail(productName) {
  const response = await fetch(`/api/product/${encodeURIComponent(productName)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch /api/product/[name]');
  }

  const payload = await response.json();
  return payload.data || [];
}

function getInsight(growth) {
  if (growth > 100) {
    return 'Produk ini sedang naik drastis, cocok untuk langsung dibuat konten sekarang';
  }

  if (growth >= 50 && growth <= 100) {
    return 'Produk ini sedang naik, peluang bagus untuk konten';
  }

  if (growth < 20) {
    return 'Produk mulai stabil';
  }

  return 'Produk menunjukkan tren positif, tetap pantau performanya';
}

export default function SalesChart() {
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [trendingRows, setTrendingRows] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [productSeries, setProductSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadProductDetail = useCallback(async (productName) => {
    try {
      setDetailLoading(true);
      const rows = await fetchProductDetail(productName);
      setProductSeries(rows);
      setDetailError('');
    } catch (err) {
      setDetailError(err.message || 'Failed to load product detail');
      setProductSeries([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [monthly, trending] = await Promise.all([fetchTopMonth(), fetchTrending()]);

      setMonthlyRows(monthly);
      setTrendingRows(trending);

      if (!selectedProduct && trending.length > 0) {
        const nextProduct = trending[0].product_name;
        setSelectedProduct(nextProduct);
        await loadProductDetail(nextProduct);
      }

      if (selectedProduct) {
        const stillExists = trending.some((item) => item.product_name === selectedProduct);
        const nextProduct = stillExists
          ? selectedProduct
          : trending.length > 0
          ? trending[0].product_name
          : '';

        if (nextProduct) {
          if (nextProduct !== selectedProduct) {
            setSelectedProduct(nextProduct);
          }
          await loadProductDetail(nextProduct);
        } else {
          setSelectedProduct('');
          setProductSeries([]);
        }
      }

      setError('');
    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [loadProductDetail, selectedProduct]);

  const onPickProduct = useCallback(
    async (productName) => {
      setSelectedProduct(productName);
      await loadProductDetail(productName);
    },
    [loadProductDetail]
  );

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  const categoryList = useMemo(() => {
    const set = new Set(['Semua']);
    for (const item of trendingRows) {
      set.add(item.category || 'Lainnya');
    }
    return Array.from(set);
  }, [trendingRows]);

  const filteredTrendingRows = useMemo(() => {
    if (selectedCategory === 'Semua') {
      return trendingRows;
    }
    return trendingRows.filter((item) => (item.category || 'Lainnya') === selectedCategory);
  }, [selectedCategory, trendingRows]);

  const topTrendingRows = useMemo(
    () =>
      [...filteredTrendingRows]
        .sort((a, b) => Number(b.trend_score || 0) - Number(a.trend_score || 0))
        .slice(0, 10),
    [filteredTrendingRows]
  );

  const labels = useMemo(
    () => topTrendingRows.map((item) => item.product_name),
    [topTrendingRows]
  );
  const totals = useMemo(
    () => topTrendingRows.map((item) => Number(item.trend_score || 0)),
    [topTrendingRows]
  );

  const categorySummary = useMemo(() => {
    const summaryMap = new Map();

    for (const item of trendingRows) {
      const category = item.category || 'Lainnya';
      const todaySales = Number(item.today_sales || 0);
      const growth = Number(item.growth_percentage || 0);
      const current = summaryMap.get(category) || {
        category,
        products: 0,
        total_today_sales: 0,
        avg_growth: 0,
      };

      summaryMap.set(category, {
        category,
        products: current.products + 1,
        total_today_sales: current.total_today_sales + todaySales,
        avg_growth: current.avg_growth + growth,
      });
    }

    return Array.from(summaryMap.values())
      .map((item) => ({
        ...item,
        avg_growth: item.products > 0 ? Number((item.avg_growth / item.products).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.total_today_sales - a.total_today_sales);
  }, [trendingRows]);

  useEffect(() => {
    if (filteredTrendingRows.length === 0) {
      return;
    }

    const stillExists = filteredTrendingRows.some((item) => item.product_name === selectedProduct);
    if (stillExists) {
      return;
    }

    const nextProduct = filteredTrendingRows[0].product_name;
    setSelectedProduct(nextProduct);
    loadProductDetail(nextProduct);
  }, [filteredTrendingRows, loadProductDetail, selectedProduct]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Trend Score',
        data: totals,
        backgroundColor: [
          '#0b6e4f',
          '#298f6f',
          '#ff8c42',
          '#f4b400',
          '#e4572e',
          '#45a29e',
          '#5f6caf',
          '#f07167',
          '#2a9d8f',
          '#6c757d',
        ],
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      title: {
        display: true,
        text: 'Top 10 Produk Trending (Trend Score)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: (value) => value,
        },
      },
    },
  };

  const lineData = {
    labels: productSeries.map((item) => item.sale_date),
    datasets: [
      {
        label: 'Skor Harian',
        data: productSeries.map((item) => item.total_sold),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.18)',
        borderWidth: 3,
        tension: 0.32,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#f43f5e',
      },
    ],
  };

  const dailySummary = useMemo(() => {
    if (productSeries.length === 0) {
      return {
        total: 0,
        average: 0,
        peakValue: 0,
        latestValue: 0,
      };
    }

    const values = productSeries.map((item) => Number(item.total_sold || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const peakValue = Math.max(...values);

    return {
      total,
      average: Number((total / values.length).toFixed(1)),
      peakValue,
      latestValue: values[values.length - 1] || 0,
    };
  }, [productSeries]);

  const detailedLabels = useMemo(
    () =>
      productSeries.map((item) =>
        new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
          new Date(`${item.sale_date}T00:00:00`)
        )
      ),
    [productSeries]
  );

  const detailedLineData = {
    ...lineData,
    labels: detailedLabels,
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: selectedProduct
          ? `Skor Harian 30 Hari - ${selectedProduct}`
          : 'Skor Harian 30 Hari Produk Affiliate',
      },
      tooltip: {
        callbacks: {
          title: (items) => `Tanggal: ${items[0].label}`,
          label: (item) => `Skor: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
      },
    },
  };

  return (
    <div className="dashboard-layout">
      <div className="chart-shell">
        <div className="chart-header-row">
          <h2>Peringkat Produk Trending</h2>
          <span className="chip">Refresh 5 detik</span>
        </div>

        <p className="chart-caption">
          Chart atas dan daftar bawah sekarang memakai metrik yang sama, yaitu growth trend. Jadi produk di grafik dan produk di list dibaca dengan satu arti yang sama.
        </p>

        {loading ? <p>Loading data...</p> : null}
        {error ? <p className="error-text">Error: {error}</p> : null}

        {!loading && !error ? (
          <div className="chart-container">
            <Bar data={chartData} options={options} />
          </div>
        ) : null}

        {!loading && !error && monthlyRows.length === 0 ? (
          <p>Belum ada data untuk bulan ini.</p>
        ) : null}
      </div>

      <div className="trending-shell">
        <div className="chart-header-row">
          <h2>Produk Trending</h2>
          <span className="chip">Top 10 Growth</span>
        </div>

        <p className="chart-caption">
          Angka yang tampil di sini adalah skor tren publik, bukan penjualan resmi. Skor ini dibaca dari sinyal konten TikTok yang terdeteksi saat scraping.
        </p>

        <div className="category-summary-grid">
          {categorySummary.map((item) => (
            <div key={item.category} className="category-summary-card">
              <strong>{item.category}</strong>
              <div className="category-summary-stat">
                Produk: {item.products} | Sales Hari Ini: {item.total_today_sales}
              </div>
              <div className="category-summary-growth">Rata-rata Growth: {item.avg_growth}%</div>
            </div>
          ))}
        </div>

        <div className="category-filter-row">
          {categoryList.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-filter-btn ${selectedCategory === category ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {trendingRows.length === 0 && !loading ? (
          <p>Belum ada data trending hari ini.</p>
        ) : null}

        {selectedCategory !== 'Semua' && filteredTrendingRows.length === 0 ? (
          <p>Tidak ada produk untuk kategori {selectedCategory} hari ini.</p>
        ) : null}

        <div className="trending-list">
          {filteredTrendingRows.map((item) => {
            const growth = Number(item.growth_percentage || 0);
            const isNew = item.growth_label === 'new';
            const active = selectedProduct === item.product_name;
            return (
              <button
                key={item.product_name}
                type="button"
                className={`trend-item ${growth > 50 ? 'is-hot' : ''} ${active ? 'is-active' : ''}`}
                onClick={() => onPickProduct(item.product_name)}
              >
                <div className="trend-main-row">
                  <strong>{item.product_name}</strong>
                  <span>{isNew ? 'NEW' : `${growth.toFixed(2)}%`}</span>
                </div>
                <div className="trend-sub-row">
                  <small>
                    Kategori: {item.category || 'Lainnya'} | Hari ini: {item.today_sales} | Kemarin: {item.yesterday_sales} | Status: {isNew ? 'Produk baru (belum ada data kemarin)' : `Growth ${growth.toFixed(2)}%`}
                  </small>
                </div>
                {item.source_url ? (
                  <a
                    className="video-link"
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat video sumber
                  </a>
                ) : (
                  <span className="video-link is-disabled">Video sumber belum tersimpan</span>
                )}
                <p className="insight-text">{getInsight(growth)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="line-shell">
        <div className="chart-header-row">
          <h2>Detail Produk</h2>
          <span className="chip">Klik Produk Trending</span>
        </div>

        {detailLoading ? <p>Loading detail produk...</p> : null}
        {detailError ? <p className="error-text">Error: {detailError}</p> : null}

        {!detailLoading && !detailError && selectedProduct && productSeries.length > 0 ? (
          <>
            <div className="daily-summary-grid">
              <div className="daily-summary-card">
                <span>Total 30 Hari</span>
                <strong>{dailySummary.total}</strong>
              </div>
              <div className="daily-summary-card">
                <span>Rata-rata / Hari</span>
                <strong>{dailySummary.average}</strong>
              </div>
              <div className="daily-summary-card">
                <span>Puncak Harian</span>
                <strong>{dailySummary.peakValue}</strong>
              </div>
              <div className="daily-summary-card">
                <span>Hari Terbaru</span>
                <strong>{dailySummary.latestValue}</strong>
              </div>
            </div>

            <p className="chart-caption">
              Grafik diisi penuh selama 30 hari terakhir. Hari tanpa data muncul sebagai 0 supaya pola tren lebih mudah dibaca.
            </p>

            <div className="line-container">
              <Line data={detailedLineData} options={lineOptions} />
          </div>
          </>
        ) : null}

        {!detailLoading && !detailError && selectedProduct && productSeries.length === 0 ? (
          <p>Belum ada data harian untuk produk ini.</p>
        ) : null}
      </div>
    </div>
  );
}
