import React, { useEffect, useRef } from 'react';

const SearchModal = ({ 
  isOpen, 
  query, 
  setQuery, 
  results, 
  onClose, 
  onSelectStream, 
  onToggleFavorite, 
  favorites, 
  theme 
}) => {
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div 
        className="search-modal" 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="search-header">
          <span className="search-icon-large">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Kërko kanale, filma ose seriale..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Hint */}
        <div className="search-hint">
          <span>↵ Enter për të luajtur</span>
          <span>ESC për të mbyllur</span>
          <span>★ për të shtuar në favorita</span>
        </div>

        {/* Results */}
        <div className="search-results">
          {results.length > 0 ? (
            results.map((item) => {
              const itemId = item.stream_id || item.series_id || item.id;
              const isFavorite = favorites.includes(itemId);
              const itemName = item.name || item.title;
              const itemLogo = item.logo || item.poster || item.cover;
              const itemType = item.type || 'live';
              const itemCategory = item.category || item.category_name || item.genre;
              const itemYear = item.year;

              return (
                <div
                  key={itemId}
                  className="search-result-item"
                  onClick={() => onSelectStream(item)}
                >
                  <img
                    src={itemLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(itemName || 'TV')}&size=40&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`}
                    alt={itemName}
                    className="search-result-logo"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(itemName || 'TV')}&size=40&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`;
                    }}
                  />

                  <div className="search-result-info">
                    <div className="search-result-name">{itemName}</div>
                    <div className="search-result-meta">
                      <span className={`search-result-type ${itemType}`}>
                        {itemType === 'live' ? '📺 LIVE' : 
                         itemType === 'movie' ? '🎬 FILM' : '📺 SERIAL'}
                      </span>
                      {itemCategory && (
                        <span className="search-result-category">{itemCategory}</span>
                      )}
                      {itemYear && (
                        <span className="search-result-year">{itemYear}</span>
                      )}
                    </div>
                  </div>

                  <button
                    className={`search-fav-btn ${isFavorite ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(itemId);
                    }}
                  >
                    {isFavorite ? '★' : '☆'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="search-no-results">
              {query ? 'Nuk u gjet asnjë rezultat' : 'Fillo të shkruash për të kërkuar...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;