// src/components/ChannelCard.jsx
import React, { memo } from 'react';
import './ChannelCard.css';

const ChannelCard = memo(({
  item,
  onPlay,
  onToggleFavorite,
  isFavorite,
  isSelected,
  theme,
  activeTab
}) => {
  // Kontrollo nëse item ekziston
  if (!item) return null;

  // Funksione helper për të nxjerrë të dhënat
  const getItemName = (item) => {
    return item?.name || 
           item?.title || 
           item?.stream_display_name || 
           item?.stream_name || 
           item?.channel_name || 
           item?.tvg_name || 
           'Pa Emër';
  };

  const getItemLogo = (item) => {
    return item?.logo || 
           item?.stream_icon || 
           item?.tvg_logo || 
           item?.icon || 
           item?.thumbnail || 
           item?.poster || 
           null;
  };

  const getItemId = (item) => {
    return item?.stream_id || 
           item?.series_id || 
           item?.id || 
           item?.channel_id || 
           `item-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getItemCategory = (item) => {
    return item?.group_title || 
           item?.group || 
           item?.category_name || 
           item?.category || 
           item?.tvg_group || 
           item?.genre || 
           'Pa Kategori';
  };

  const name = getItemName(item);
  const logo = getItemLogo(item);
  const id = getItemId(item);
  const category = getItemCategory(item);
  
  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay && item) {
      onPlay(item);
    }
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  return (
    <div 
      className={`channel-card theme-${theme} ${isSelected ? 'selected' : ''}`}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handlePlay(e)}
    >
      <div className="channel-card-logo-container">
        {logo ? (
          <img 
            src={logo} 
            alt={name}
            className="channel-card-logo"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=64&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`;
            }}
          />
        ) : (
          <div className="channel-card-logo-placeholder">
            <span className="placeholder-icon">
              {activeTab === 'live' ? '📺' : 
               activeTab === 'movies' ? '🎬' : 
               activeTab === 'series' ? '📺' : '📺'}
            </span>
          </div>
        )}
      </div>

      <div className="channel-card-info">
        <h3 className="channel-card-name" title={name}>
          {name}
        </h3>
        
        <div className="channel-card-meta">
          {/* Kategoria */}
          {category && category !== 'Pa Kategori' && (
            <span className="channel-card-category" title="Kategoria">
              📁 {category.length > 20 ? category.substring(0, 20) + '...' : category}
            </span>
          )}
          
          {/* Rating - nëse ekziston */}
          {item?.rating && item.rating > 0 && (
            <span className="channel-card-rating">
              ⭐ {item.rating}
            </span>
          )}
          
          {/* Year - nëse ekziston */}
          {item?.year && (
            <span className="channel-card-year">
              📅 {item.year}
            </span>
          )}
          
          {/* Duration - nëse ekziston */}
          {item?.duration && (
            <span className="channel-card-duration">
              ⏱️ {Math.floor(item.duration / 60)}min
            </span>
          )}
          
          {/* Country - nëse ekziston */}
          {item?.country && (
            <span className="channel-card-country">
              🌍 {item.country}
            </span>
          )}
        </div>
      </div>

      <div className="channel-card-actions">
        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Hiq nga favoritet' : 'Shto në favoritet'}
          title={isFavorite ? 'Hiq nga favoritet' : 'Shto në favoritet'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        
        <button
          className="play-btn"
          onClick={handlePlay}
          aria-label="Luaj"
          title="Luaj"
        >
          ▶
        </button>
      </div>

      {activeTab === 'live' && (
        <div className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </div>
      )}
    </div>
  );
});

export default ChannelCard;