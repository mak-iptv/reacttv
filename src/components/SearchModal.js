import React, { useEffect, useRef } from 'react';
import { getItemName, getItemLogo, getItemCategory, getStreamType } from '../utils/streamHelpers';
import './SearchModal.css';

const SearchModal = ({
  isOpen,
  query,
  setQuery,
  results,
  onClose,
  onSelectStream,
  onToggleFavorite,
  favorites = [],
  theme = 'dark',
  activeTab = 'live'
}) => {
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFavorite = (item) => {
    const id = item.stream_id || item.series_id || item.id;
    return favorites.includes(id);
  };

  const getTypeClass = (item) => {
    const type = getStreamType(item, activeTab);
    if (type === 'live') return 'live';
    if (type === 'movie') return 'movie';
    if (type === 'series') return 'series';
    return 'live';
  };

  const getTypeText = (item) => {
    const type = getStreamType(item, activeTab);
    if (type === 'live') return 'LIVE';
    if (type === 'movie') return 'FILM';
    if (type === 'series') return 'SERIAL';
    return 'LIVE';
  };

  return (
    <div className={`search-modal-overlay theme-${theme}`}>
      <div className="search-modal" ref={modalRef}>
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

        <div className="search-hint">
          <span>🔍 Kërko</span>
          <span>⬆⬇ Navigo</span>
          <span>↵ Luaj</span>
          <span>ESC Mbyll</span>
        </div>

        <div className="search-results">
          {results.length > 0 ? (
            results.map((item) => {
              const id = item.stream_id || item.series_id || item.id;
              const name = getItemName(item);
              const logo = getItemLogo(item);
              const category = getItemCategory(item, activeTab);
              const year = item.year || '';
              const typeClass = getTypeClass(item);
              const typeText = getTypeText(item);
              const isFav = isFavorite(item);

              return (
                <div
                  key={id}
                  className="search-result-item"
                  onClick={() => onSelectStream(item)}
                >
                  <img
                    src={logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`}
                    alt={name}
                    className="search-result-logo"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`;
                    }}
                  />
                  <div className="search-result-info">
                    <div className="search-result-name">{name}</div>
                    <div className="search-result-meta">
                      <span className={`search-result-type ${typeClass}`}>
                        {typeText}
                      </span>
                      {category && (
                        <span className="search-result-category">{category}</span>
                      )}
                      {year && (
                        <span className="search-result-year">{year}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`search-fav-btn ${isFav ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(id);
                    }}
                  >
                    {isFav ? '⭐' : '☆'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="search-no-results">
              {query ? 'Nuk u gjet asnjë rezultat' : 'Shkruani për të kërkuar...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;