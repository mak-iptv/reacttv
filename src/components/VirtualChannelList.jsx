// src/components/VirtualChannelList.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import ChannelCard from './ChannelCard';
import LoadingSpinner from './LoadingSpinner';
import './VirtualChannelList.css';

const VirtualChannelList = ({
  items = [],
  onPlay,
  onToggleFavorite,
  favorites = [],
  selectedItem,
  theme,
  activeTab,
  hasMore = false,
  onLoadMore,
  isLoading = false
}) => {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const ITEM_HEIGHT = 100; // Lartësia e çdo karte në pixel
  const BUFFER_SIZE = 5; // Numri i elementeve para dhe pas

  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );

    setVisibleRange({ start: startIndex, end: endIndex });

    // Load more when near the end
    if (hasMore && !isLoading && endIndex >= items.length - 10) {
      onLoadMore?.();
    }
  }, [items.length, hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', calculateVisibleRange);
    window.addEventListener('resize', calculateVisibleRange);

    calculateVisibleRange();

    return () => {
      container.removeEventListener('scroll', calculateVisibleRange);
      window.removeEventListener('resize', calculateVisibleRange);
    };
  }, [calculateVisibleRange]);

  useEffect(() => {
    calculateVisibleRange();
  }, [items, calculateVisibleRange]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const topPadding = visibleRange.start * ITEM_HEIGHT;
  const bottomPadding = (items.length - visibleRange.end) * ITEM_HEIGHT;

  if (!items || items.length === 0) {
    return (
      <div className={`virtual-list-empty theme-${theme}`}>
        <div className="empty-state">
          <span className="empty-icon">📺</span>
          <h3>Nuk u gjet asnjë kanal</h3>
          <p>Provo të ndryshosh kategorinë</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list-container theme-${theme}`}
    >
      <div 
        className="virtual-list-content"
        style={{ 
          paddingTop: `${topPadding}px`,
          paddingBottom: `${bottomPadding}px`
        }}
      >
        <div className="virtual-list-grid">
          {visibleItems.map((item, index) => {
            const itemId = item.stream_id || item.series_id || item.id || `item-${visibleRange.start + index}`;
            const isFavorite = favorites.includes(itemId);
            const isSelected = selectedItem?.stream_id === itemId || 
                             selectedItem?.series_id === itemId || 
                             selectedItem?.id === itemId;

            return (
              <ChannelCard
                key={`${itemId}-${visibleRange.start + index}`}
                item={item}
                onPlay={onPlay}
                onToggleFavorite={() => onToggleFavorite(itemId)}
                isFavorite={isFavorite}
                isSelected={isSelected}
                theme={theme}
                activeTab={activeTab}
              />
            );
          })}
        </div>

        {isLoading && (
          <div className="virtual-list-loading">
            <LoadingSpinner theme={theme} size="small" />
            <span>Duke ngarkuar...</span>
          </div>
        )}
      </div>

      <div className="virtual-list-stats">
        Duke shfaqur {items.length} {activeTab === 'live' ? 'kanale' : 
                                   activeTab === 'movies' ? 'filma' : 'seriale'}
      </div>
    </div>
  );
};

export default VirtualChannelList;