// src/hooks/useChannelCache.js
import { useCallback, useRef } from 'react';

export const useChannelCache = () => {
  const cache = useRef(new Map());

  const getCachedChannels = useCallback((type, category) => {
    const key = `${type}_${category}`;
    const cached = cache.current.get(key);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minuta
      return cached.data;
    }
    return null;
  }, []);

  const setCachedChannels = useCallback((type, category, channels) => {
    const key = `${type}_${category}`;
    cache.current.set(key, {
      data: channels,
      timestamp: Date.now()
    });
  }, []);

  const prefetchCategory = useCallback(async (credentials, type, categoryId) => {
    const key = `${type}_${categoryId}`;
    
    if (cache.current.has(key)) return;
    
    // Ngarko në background
    setTimeout(async () => {
      try {
        const { getChannelsByCategory } = await import('../services/xtream');
        const channels = await getChannelsByCategory(
          credentials.server,
          credentials.username,
          credentials.password,
          type,
          categoryId
        );
        
        cache.current.set(key, {
          data: channels,
          timestamp: Date.now()
        });
        
        console.log(`✅ Prefetched ${type} category ${categoryId}`);
      } catch (err) {
        console.error(`❌ Failed to prefetch ${type} category ${categoryId}:`, err);
      }
    }, 100);
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return {
    getCachedChannels,
    setCachedChannels,
    prefetchCategory,
    clearCache
  };
};