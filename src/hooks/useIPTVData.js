// src/hooks/useIPTVData.js
import { useState, useMemo } from 'react';
import { getItemCategory } from '../utils/streamHelpers';

export function useIPTVData() {
  const [channels, setChannels] = useState([]);
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState({ live: [], movies: [], series: [] });

  // Safe arrays
  const safeChannels = useMemo(() => Array.isArray(channels) ? channels : [], [channels]);
  const safeMovies = useMemo(() => Array.isArray(movies) ? movies : [], [movies]);
  const safeSeries = useMemo(() => Array.isArray(series) ? series : [], [series]);

  // Nxjerr kategoritë nga kanalet
  const channelCategories = useMemo(() => {
    const cats = new Set();
    safeChannels.forEach(ch => {
      const cat = getItemCategory(ch, 'live');
      if (cat && cat !== 'Të tjera') cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [safeChannels]);

  const clearData = () => {
    setChannels([]);
    setMovies([]);
    setSeries([]);
    setCategories({ live: [], movies: [], series: [] });
  };

  return {
    channels, setChannels,
    movies, setMovies,
    series, setSeries,
    categories, setCategories,
    safeChannels, safeMovies, safeSeries,
    channelCategories,
    clearData
  };
}