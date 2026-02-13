// src/components/OptimizedChannelList.jsx
import React, { useState, useMemo, useCallback } from 'react';

const OptimizedChannelList = ({ 
  items, 
  onPlay, 
  onToggleFavorite, 
  favorites, 
  selectedItem, 
  theme,
  activeTab 
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  // ✅ Grupimi i kategorive - O(n)
  const { categories, categoryMap } = useMemo(() => {
    console.time('Grupimi i kategorive');
    
    const cats = {};
    const map = {};
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const category = item.groupTitle || 
                      item.category_name || 
                      item.category || 
                      'Pa Kategori';
      
      if (!cats[category]) {
        cats[category] = [];
        map[category] = category;
      }
      cats[category].push(item);
    }
    
    console.timeEnd('Grupimi i kategorive');
    return { categories: cats, categoryMap: map };
  }, [items]);

  // ✅ Toggle kategorive - shfaq/fsheh
  const toggleCategory = useCallback((category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // ✅ Load more për një kategori
  const [categoryPages, setCategoryPages] = useState({});
  
  const loadMoreForCategory = useCallback((category) => {
    const currentPage = categoryPages[category] || 1;
    const itemsPerPage = 20;
    
    setCategoryPages(prev => ({
      ...prev,
      [category]: currentPage + 1
    }));
  }, []);

  if (!items || items.length === 0) {
    return <EmptyState theme={theme} />;
  }

  return (
    <div className={`optimized-channel-list theme-${theme}`}>
      {Object.entries(categories).map(([category, categoryItems]) => {
        const isExpanded = expandedCategories[category] !== false;
        const currentPage = categoryPages[category] || 1;
        const itemsPerPage = 20;
        const displayedItems = isExpanded 
          ? categoryItems.slice(0, currentPage * itemsPerPage)
          : categoryItems.slice(0, 10); // Vetëm 10 kur është e mbyllur
        
        return (
          <CategorySection
            key={category}
            category={category}
            items={displayedItems}
            totalItems={categoryItems.length}
            isExpanded={isExpanded}
            onToggle={() => toggleCategory(category)}
            onLoadMore={() => loadMoreForCategory(category)}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
            favorites={favorites}
            selectedItem={selectedItem}
            theme={theme}
            activeTab={activeTab}
          />
        );
      })}
    </div>
  );
};

// Memoized category section
const CategorySection = React.memo(({
  category,
  items,
  totalItems,
  isExpanded,
  onToggle,
  onLoadMore,
  ...props
}) => {
  return (
    <div className="channel-category-section">
      <div 
        className="channel-category-header clickable"
        onClick={onToggle}
      >
        <h3 className="channel-category-title">
          <span className="category-icon">
            {isExpanded ? '▼' : '►'}
          </span>
          {category}
          <span className="category-count">{totalItems}</span>
        </h3>
      </div>
      
      {isExpanded && (
        <>
          <div className="channel-grid">
            {items.map(item => (
              <ChannelCardMemo 
                key={item.stream_id || item.id}
                item={item}
                {...props}
              />
            ))}
          </div>
          
          {items.length < totalItems && (
            <button 
              className="load-more-category"
              onClick={onLoadMore}
            >
              Ngarko më shumë...
            </button>
          )}
        </>
      )}
    </div>
  );
});

const ChannelCardMemo = React.memo(ChannelCard, (prev, next) => {
  // ✅ Ridërto vetëm kur ndryshojnë këto propertie
  return prev.item.stream_id === next.item.stream_id &&
         prev.isFavorite === next.isFavorite &&
         prev.isSelected === next.isSelected;
});

export default OptimizedChannelList;