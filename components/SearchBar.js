'use client';

import { useCallback, useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    async (e) => {
      e.preventDefault();

      if (!query.trim()) {
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/product-search?q=${encodeURIComponent(query.trim())}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Search gagal');
        }

        const result = await response.json();
        onSearch(result.data, query);
      } catch (error) {
        console.error('Search error:', error);
        onSearch([], query);
      } finally {
        setLoading(false);
      }
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch(null, '');
  }, [onSearch]);

  return (
    <div className="search-bar">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Cari produk bulan ini..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? 'Mencari...' : 'Cari'}
        </button>
      </form>
      {query && (
        <button type="button" className="clear-btn" onClick={handleClear}>
          Bersihkan
        </button>
      )}
    </div>
  );
}
