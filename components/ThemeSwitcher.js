'use client';

import { useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'theme-preference';
const CUSTOM_KEY = 'theme-custom-palette';

const DEFAULT_CUSTOM = {
  bg: '#111827',
  card: '#1f2937',
  accent: '#22d3ee',
  accent2: '#f43f5e',
};

function getResolvedTheme(preference) {
  if (preference !== 'system') {
    return preference;
  }

  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function clearCustomOverrides(root) {
  root.style.removeProperty('--bg-1');
  root.style.removeProperty('--card');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-2');
}

function applyCustomOverrides(root, palette) {
  root.style.setProperty('--bg-1', palette.bg);
  root.style.setProperty('--card', palette.card);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-2', palette.accent2);
}

function applyTheme(preference, customPalette) {
  const root = document.documentElement;

  if (preference === 'custom') {
    root.setAttribute('data-theme', 'custom');
    applyCustomOverrides(root, customPalette);
    return;
  }

  clearCustomOverrides(root);
  const resolved = getResolvedTheme(preference);
  root.setAttribute('data-theme', resolved);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState('system');
  const [customPalette, setCustomPalette] = useState(DEFAULT_CUSTOM);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
    const savedPalette = localStorage.getItem(CUSTOM_KEY);

    let nextPalette = DEFAULT_CUSTOM;
    if (savedPalette) {
      try {
        nextPalette = { ...DEFAULT_CUSTOM, ...JSON.parse(savedPalette) };
      } catch {
        nextPalette = DEFAULT_CUSTOM;
      }
    }

    setTheme(savedTheme);
    setCustomPalette(nextPalette);
    applyTheme(savedTheme, nextPalette);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      const currentTheme = localStorage.getItem(THEME_KEY) || 'system';
      if (currentTheme === 'system') {
        applyTheme('system', nextPalette);
      }
    };

    media.addEventListener('change', onMediaChange);
    return () => media.removeEventListener('change', onMediaChange);
  }, []);

  const currentLabel = useMemo(() => {
    if (theme === 'system') {
      return `System (${getResolvedTheme('system')})`;
    }

    return theme;
  }, [theme]);

  const onThemeChange = (value) => {
    setTheme(value);
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value, customPalette);
  };

  const onCustomPaletteChange = (key, value) => {
    const nextPalette = {
      ...customPalette,
      [key]: value,
    };

    setCustomPalette(nextPalette);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(nextPalette));

    if (theme === 'custom') {
      applyTheme('custom', nextPalette);
    }
  };

  return (
    <div className="theme-switcher-card">
      <div className="theme-switcher-row">
        <label htmlFor="themeSelect">Tema</label>
        <select
          id="themeSelect"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          className="theme-select"
        >
          <option value="system">System (Auto)</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="tiktok">TikTok Neon</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <p className="theme-note">Aktif: {currentLabel}</p>

      {theme === 'custom' ? (
        <div className="theme-custom-grid">
          <label>
            Background
            <input
              type="color"
              value={customPalette.bg}
              onChange={(e) => onCustomPaletteChange('bg', e.target.value)}
            />
          </label>
          <label>
            Card
            <input
              type="color"
              value={customPalette.card}
              onChange={(e) => onCustomPaletteChange('card', e.target.value)}
            />
          </label>
          <label>
            Accent
            <input
              type="color"
              value={customPalette.accent}
              onChange={(e) => onCustomPaletteChange('accent', e.target.value)}
            />
          </label>
          <label>
            Accent 2
            <input
              type="color"
              value={customPalette.accent2}
              onChange={(e) => onCustomPaletteChange('accent2', e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
