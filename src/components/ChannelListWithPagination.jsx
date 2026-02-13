// src/components/ChannelListWithPagination.jsx
import React, { useRef, useCallback, useEffect } from 'react';
import ChannelCard from './ChannelCard';
import LoadingSpinner from './LoadingSpinner';
import './ChannelListWithPagination.css';

const ChannelListWithPagination = ({
  items = [],
  onPlay,
  onToggleFavorite,
  favorites = [],
  selectedItem,
  theme,
  activeTab,
  onLoadMore,
  hasMore = false,
  isLoading = false
}) => {
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (isLoading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && onLoadMore) {
        onLoadMore();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, onLoadMore, isLoading]);

  // Funksione helper për të nxjerrë ID
  const getItemId = (item) => {
    if (!item) return null;
    return item.stream_id || item.series_id || item.id || item.channel_id || 
           `item-${Math.random()}`;
  };

  if (!items || items.length === 0) {
    return (
      <div className={`channel-list-empty theme-${theme}`}>
        <div className="empty-state">
          <span className="empty-icon">📺</span>
          <h3>Nuk u gjet asnjë kanal</h3>
          <p>Provo të ndryshosh kategorinë ose të shtosh një playlist tjetër</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`channel-list theme-${theme}`}>
      <div className="channel-grid">
        {items.map((item, index) => {
          // Kontrollo nëse item ekziston
          if (!item) return null;
          
          const itemId = getItemId(item);
          const isFavorite = favorites?.includes(itemId) || false;
          const isSelected = selectedItem ? (
            selectedItem.stream_id === itemId || 
            selectedItem.series_id === itemId || 
            selectedItem.id === itemId
          ) : false;

          return (
            <ChannelCard
              key={`${itemId}-${index}`}
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

      {/* Loading indicator and intersection observer target */}
      {hasMore && (
        <div ref={loadMoreRef} className="load-more-container">
          {isLoading ? (
            <LoadingSpinner theme={theme} size="small" />
          ) : (
            <div className="load-more-trigger">Duke ngarkuar më shumë...</div>
          )}
        </div>
      )}

      {/* Items count */}
      <div className="channel-list-footer">
        <span className="items-count">
          Duke shfaqur {items.length} {activeTab === 'live' ? 'kanale' : 
                                   activeTab === 'movies' ? 'filma' : 'seriale'}
        </span>
      </div>
    </div>
  );
};

export default ChannelListWithPagination;