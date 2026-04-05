'use client';

import { useState } from 'react';
import SalesChart from '../components/SalesChart';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import ThemeSwitcher from '../components/ThemeSwitcher';

export default function HomePage() {
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (results, query) => {
    setSearchResults(results);
    setSearchQuery(query);
  };

  return (
    <main className="page-wrapper">
      <section className="hero">
        <div className="hero-top-row">
          <div>
            <h1>TikTok Trending Product Analyzer</h1>
            <p>
              Pantau produk paling ramai secara realtime untuk bantu kamu ikut tren affiliate lebih cepat.
            </p>
          </div>
          <ThemeSwitcher />
        </div>
      </section>

      <section className="search-section">
        <SearchBar onSearch={handleSearch} />
      </section>

      <section className="card-grid">
        {searchResults !== null ? (
          <SearchResults results={searchResults} query={searchQuery} />
        ) : (
          <div className="dashboard-card">
            <SalesChart />
          </div>
        )}
      </section>
    </main>
  );
}
