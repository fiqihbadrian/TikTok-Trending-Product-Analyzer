'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

async function fetchProductDaily(productName) {
  const response = await fetch(`/api/product/${encodeURIComponent(productName)}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product daily data');
  }

  const payload = await response.json();
  return payload.data || [];
}

export default function SearchResults({ results, query }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (results && results.length > 0) {
      setSelectedProduct(results[0]);
      loadDailyData(results[0].product_name);
    }
  }, [results]);

  const loadDailyData = async (productName) => {
    try {
      setLoading(true);
      const data = await fetchProductDaily(productName);
      setDailyData(data);
    } catch (error) {
      console.error('Error loading daily data:', error);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    loadDailyData(product.product_name);
  };

  const chartSummary = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        total: 0,
        average: 0,
        peakValue: 0,
        latestValue: 0,
      };
    }

    const values = dailyData.map((item) => Number(item.total_sold || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const peakValue = Math.max(...values);

    return {
      total,
      average: Number((total / values.length).toFixed(1)),
      peakValue,
      latestValue: values[values.length - 1] || 0,
    };
  }, [dailyData]);

  const chartLabels = useMemo(
    () =>
      dailyData.map((item) =>
        new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(
          new Date(`${item.sale_date}T00:00:00`)
        )
      ),
    [dailyData]
  );

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Skor Harian',
        data: dailyData.map((item) => item.total_sold),
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: selectedProduct ? `Skor Harian 30 Hari - ${selectedProduct.product_name}` : 'Skor Harian 30 Hari',
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

  if (!results) {
    return null;
  }

  return (
    <>
      <div className="dashboard-card search-card">
        <div className="chart-header-row">
          <h2>Hasil Pencarian: "{query}"</h2>
          <span className="chip">{results.length} produk ditemukan</span>
        </div>

        <p className="chart-caption">
          Skor tren di bawah ini adalah angka sinyal publik yang terdeteksi dari posting TikTok, bukan angka penjualan resmi.
        </p>

        {results.length === 0 ? (
          <p>Tidak ada produk yang cocok dengan pencarian "{query}".</p>
        ) : (
          <div className="search-results-grid">
            {results.map((product) => (
              <button
                key={product.product_name}
                type="button"
                className={`result-item ${selectedProduct?.product_name === product.product_name ? 'is-active' : ''}`}
                onClick={() => handleProductClick(product)}
              >
                <strong>{product.product_name}</strong>
                <div className="result-category">Kategori: {product.category || 'Lainnya'}</div>
                <div className="result-stat">Skor Tren: {product.total_sold}</div>
                {product.source_url ? (
                  <a
                    className="video-link"
                    href={product.source_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Lihat video sumber
                  </a>
                ) : (
                  <span className="video-link is-disabled">Video sumber belum tersimpan</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="dashboard-card search-card">
          <div className="chart-header-row">
            <h2>Detail Penjualan Harian</h2>
            <span className="chip">Bulan Ini</span>
          </div>

          <div className="daily-summary-grid">
            <div className="daily-summary-card">
              <span>Total skor 30 hari</span>
              <strong>{chartSummary.total}</strong>
            </div>
            <div className="daily-summary-card">
              <span>Rata-rata skor / hari</span>
              <strong>{chartSummary.average}</strong>
            </div>
            <div className="daily-summary-card">
              <span>Skor harian tertinggi</span>
              <strong>{chartSummary.peakValue}</strong>
            </div>
            <div className="daily-summary-card">
              <span>Skor hari terbaru</span>
              <strong>{chartSummary.latestValue}</strong>
            </div>
          </div>

          <p className="chart-caption">
            Grafik ini sudah diisi selama 30 hari terakhir. Hari tanpa data tampil sebagai 0 supaya arah trend lebih jelas.
          </p>

          {loading ? (
            <p>Memuat data harian...</p>
          ) : dailyData.length === 0 ? (
            <p>Belum ada data penjualan untuk produk ini.</p>
          ) : (
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
