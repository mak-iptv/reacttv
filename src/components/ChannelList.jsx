// src/components/ChannelListWithPagination.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

const ChannelListWithPagination = ({ 
  items, 
  onPlay, 
  onToggleFavorite, 
  favorites, 
  selectedItem, 
  theme,
  activeTab 
}) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef();
  const lastItemRef = useRef();
  
  const ITEMS_PER_PAGE = 50; // ✅ Vetëm 50 kanale për faqe!

  // Grupimi vetëm për items të shfaqura
  const groupedItems = useMemo(() => {
    if (!displayedItems.length) return {};
    
    return displayedItems.reduce((groups, item) => {
      let category = item.groupTitle || 
                    item.category_name || 
                    item.category || 
                    'Pa Kategori';
      category = category.trim();
      
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
      return groups;
    }, {});
  }, [displayedItems]);

  // Load more me Intersection Observer
  useEffect(() => {
    if (loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );
    
    if (lastItemRef.current) {
      observer.observe(lastItemRef.current);
    }
    
    return () => observer.disconnect();
  }, [loading, hasMore, displayedItems]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Simulim i ngarkimit gradual
    setTimeout(() => {
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const newItems = items.slice(start, end);
      
      if (newItems.length > 0) {
        setDisplayedItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
      
      if (end >= items.length) {
        setHasMore(false);
      }
      
      setLoading(false);
    }, 100);
  }, [items, page, loading, hasMore]);

  // Reset kur ndërrohet kategoria
  useEffect(() => {
    setDisplayedItems([]);
    setPage(1);
    setHasMore(true);
    
    // Ngarko faqen e parë
    if (items.length > 0) {
      setDisplayedItems(items.slice(0, ITEMS_PER_PAGE));
    }
  }, [items]);

  if (!items || items.length === 0) {
    return (
      <div className={`channel-list-empty theme-${theme}`}>
        <div className="empty-icon">📺</div>
        <h3>Nuk ka kanale</h3>
        <p>Nuk u gjet asnjë kanal në këtë kategori</p>
      </div>
    );
  }

  return (
    <div className={`channel-list theme-${theme}`}>
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="channel-category-section">
          <div className="channel-category-header">
            <h3 className="channel-category-title">
              <span className="category-icon">
                {activeTab === 'live' ? '📺' : activeTab === 'movies' ? '🎬' : '📺'}
              </span>
              {category}
              <span className="category-count">{categoryItems.length}</span>
            </h3>
          </div>
          
          <div className="channel-grid">
            {categoryItems.map((item, index) => {
              const itemId = item.stream_id || item.id || item.series_id;
              const isLastItem = index === categoryItems.length - 1;
              
              return (
                <ChannelCard
                  key={itemId}
                  item={item}
                  isLastItem={isLastItem}
                  lastItemRef={lastItemRef}
                  onPlay={onPlay}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.includes(itemId)}
                  isSelected={selectedItem?.stream_id === itemId || selectedItem?.id === itemId}
                  theme={theme}
                  activeTab={activeTab}
                  category={category}
                />
              );
            })}
          </div>
        </div>
      ))}
      
      {loading && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <span>Duke ngarkuar më shumë kanale...</span>
        </div>
      )}
      
      {!hasMore && displayedItems.length < items.length && (
        <button 
          className="load-more-btn"
          onClick={loadMore}
          disabled={loading}
        >
          Ngarko më shumë
        </button>
      )}
    </div>
  );
};

// Komponent i veçantë për performancë më të mirë
const ChannelCard = React.memo(({ 
  item, 
  isLastItem, 
  lastItemRef, 
  onPlay, 
  onToggleFavorite, 
  isFavorite, 
  isSelected, 
  theme, 
  activeTab, 
  category 
}) => {
  const itemId = item.stream_id || item.id || item.series_id;
  const itemName = getItemName(item);
  const itemLogo = getItemLogo(item);
  const streamType = getStreamType(item, activeTab);

  return (
    <div
      ref={isLastItem ? lastItemRef : null}
      className={`channel-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onPlay(item)}
      role="button"
      tabIndex={0}
    >
      <div className="channel-card-image">
        <img
          src={itemLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(itemName)}&size=80&background=${theme === 'dark' ? '2d3748' : 'e2e8f0'}`}
          alt={itemName}
          loading="lazy"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(itemName)}&size=80&background=${theme === 'dark' ? '2d3748' : 'e2e8f0'}`;
          }}
        />
        <div className="channel-card-badge">
          {streamType === 'live' ? 'LIVE' : 
           streamType === 'movie' ? 'FILM' : 
           streamType === 'series' ? 'SERIAL' : 'HD'}
        </div>
      </div>
      
      <div className="channel-card-content">
        <h4 className="channel-card-title">{itemName}</h4>
        <div className="channel-card-footer">
          <span className="channel-card-category">{category}</span>
          <button
            className={`channel-card-favorite ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(itemId);
            }}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChannelListWithPagination;