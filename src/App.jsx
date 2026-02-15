// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import HlsPlayer from "./components/HlsPlayer";
import XtreamLogin from "./components/XtreamLogin";
import axios from "axios";
import M3UUploader from "./components/M3UUploader";
import SearchModal from "./components/SearchModal";
import WelcomeScreen from "./components/WelcomeScreen";
import ChannelListWithPagination from "./components/ChannelListWithPagination";
import VirtualChannelList from "./components/VirtualChannelList";
import Toast from "./components/Toast";
import LoadingSpinner from "./components/LoadingSpinner";
import LanguageSelector from "./components/LanguageSelector";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { useIPTVData } from "./hooks/useIPTVData";
import { useTheme } from "./hooks/useTheme";
import { useErrorHandler } from "./hooks/useErrorHandler";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { 
  xtreamLogin, 
  getXtreamCategories,
  getXtreamChannels,
  getAllContent, 
  getAllCategories, 
  buildStreamUrl,
  getEPG,
  fetchM3UFromUrl,
  parseM3U
} from './services/xtream';
import { 
  getItemCategory, 
  getItemName, 
  getItemId, 
  getItemLogo, 
  getStreamType,
  searchItems
} from './utils/streamHelpers';
import { TABS, SOURCE_TYPES, STREAM_TYPES, APP_CONSTANTS } from './constants/iptv';
import "./App.css";

const INITIAL_CREDENTIALS = {
  server: "",
  username: "",
  password: "",
  isLoggedIn: false,
  expires: null,
  activeConnections: null,
  maxConnections: null,
  auth: null
};

const INITIAL_LOADING_STATE = {
  categories: false,
  channels: false,
  movies: false,
  series: false,
  general: false
};

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { error, success, handleError, handleSuccess, clearMessages } = useErrorHandler();
  const [favorites, setFavorites] = useLocalStorage('iptv-favorites', []);
  const [recentItems, setRecentItems] = useLocalStorage('iptv-recent', []);
  
  const {
    channels, setChannels,
    movies, setMovies,
    series, setSeries,
    categories, setCategories,
    safeChannels, safeMovies, safeSeries,
    clearData
  } = useIPTVData();

  const [xtreamCredentials, setXtreamCredentials] = useState(INITIAL_CREDENTIALS);
  const [currentStream, setCurrentStream] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStreamInfo, setCurrentStreamInfo] = useState(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [epgData, setEpgData] = useState([]);
  const [currentEpg, setCurrentEpg] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.LIVE);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showXtreamLogin, setShowXtreamLogin] = useState(false);
  const [showM3UModal, setShowM3UModal] = useState(true);
  const [sourceType, setSourceType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(APP_CONSTANTS.DEFAULT_CATEGORY);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(INITIAL_LOADING_STATE);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // ================ SET LOADING ================
  const setLoading = useCallback((key, value) => {
    setIsLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // ================ FETCH EPG DATA ================
  const fetchEPGData = useCallback(async (streamId) => {
    if (sourceType !== SOURCE_TYPES.XTREAM || !xtreamCredentials.isLoggedIn) return;

    try {
      const epg = await getEPG(
        xtreamCredentials.server,
        xtreamCredentials.username,
        xtreamCredentials.password,
        streamId
      );
      
      setEpgData(epg || []);
      
      const now = Math.floor(Date.now() / 1000);
      const current = (epg || []).find(p => 
        p.start_timestamp <= now && p.end_timestamp >= now
      );
      setCurrentEpg(current || null);
    } catch (err) {
      console.error('❌ EPG error:', err);
    }
  }, [sourceType, xtreamCredentials]);

  // ================ BUILD STREAM URL ================
  const buildStreamUrlFromCredentials = useCallback((item) => {
    if (sourceType !== SOURCE_TYPES.XTREAM || !xtreamCredentials.isLoggedIn) {
      return item.stream_url || item.url;
    }

    const { server, username, password } = xtreamCredentials;
    const streamType = getStreamType(item, activeTab);
    const streamId = item.stream_id || item.series_id || item.id;
    const extension = item.container_extension || 'm3u8';

    return buildStreamUrl(streamType, streamId, server, username, password, extension);
  }, [sourceType, xtreamCredentials, activeTab]);

  // ================ HANDLE PLAY ================
  const handlePlay = useCallback(async (item) => {
    if (!item) return;

    try {
      setIsPlaying(false);
      setCurrentStream(null);
      
      await new Promise(resolve => setTimeout(resolve, 50));

      const streamUrl = buildStreamUrlFromCredentials(item);
      
      if (!streamUrl) {
        throw new Error(t('streamUrlInvalid') || 'Stream URL nuk eshte i vlefshem');
      }

      const itemId = getItemId(item);
      const itemName = getItemName(item);
      const itemLogo = getItemLogo(item);
      const itemCategory = getItemCategory(item, activeTab);
      const streamType = getStreamType(item, activeTab);
      
      setCurrentStream(streamUrl);
      setCurrentStreamInfo({
        id: itemId,
        name: itemName,
        logo: itemLogo,
        category: itemCategory,
        type: streamType
      });
      setSelectedItem(item);
      setIsPlayerVisible(true);
      
      setTimeout(() => {
        setIsPlaying(true);
      }, 100);
      
      setRecentItems(prev => {
        const filtered = prev.filter(i => getItemId(i) !== itemId);
        return [item, ...filtered].slice(0, APP_CONSTANTS.MAX_RECENT_ITEMS);
      });

      if (streamType === STREAM_TYPES.LIVE) {
        fetchEPGData(itemId);
      }
      
    } catch (err) {
      console.error('❌ Play error:', err);
      handleError(err, t('playerError') + ': ' + err.message);
    }
  }, [buildStreamUrlFromCredentials, activeTab, fetchEPGData, handleError, setRecentItems, t]);

  // ================ HANDLE XTREAM LOGIN ================
  const handleXtreamLogin = useCallback(async (credentials) => {
    setLoading('general', true);
    clearMessages();
    
    try {
      const login = await xtreamLogin(credentials.server, credentials.username, credentials.password);
      
      if (!login.success) {
        throw new Error(login.error || t('loginError') || 'Kredencialet e gabuara');
      }

      const [content, allCategories] = await Promise.all([
        getAllContent(credentials.server, credentials.username, credentials.password),
        getAllCategories(credentials.server, credentials.username, credentials.password)
      ]);

      const liveWithUrls = (content.live || []).map(ch => ({
        ...ch,
        stream_url: buildStreamUrl(
          STREAM_TYPES.LIVE,
          ch.stream_id,
          credentials.server,
          credentials.username,
          credentials.password
        ),
        type: STREAM_TYPES.LIVE
      }));

      const moviesWithUrls = (content.movies || []).map(m => ({
        ...m,
        stream_url: buildStreamUrl(
          STREAM_TYPES.MOVIE,
          m.stream_id,
          credentials.server,
          credentials.username,
          credentials.password,
          m.container_extension || 'mp4'
        ),
        type: STREAM_TYPES.MOVIE
      }));

      const seriesWithUrls = (content.series || []).map(s => ({
        ...s,
        stream_url: buildStreamUrl(
          STREAM_TYPES.SERIES,
          s.series_id,
          credentials.server,
          credentials.username,
          credentials.password
        ),
        type: STREAM_TYPES.SERIES
      }));

      setChannels(liveWithUrls);
      setMovies(moviesWithUrls);
      setSeries(seriesWithUrls);
      setCategories(allCategories);
      
      setXtreamCredentials({ 
        ...credentials, 
        isLoggedIn: true,
        auth: login.data
      });
      
      setSourceType(SOURCE_TYPES.XTREAM);
      setShowXtreamLogin(false);
      setActiveTab(TABS.LIVE);
      setSelectedCategory(APP_CONSTANTS.DEFAULT_CATEGORY);
      
      handleSuccess(t('loginSuccess') + `! ${liveWithUrls.length} ${t('channels')}, ${moviesWithUrls.length} ${t('movies')}, ${seriesWithUrls.length} ${t('series')}`);
      
    } catch (err) {
      console.error('❌ Login error:', err);
      handleError(err, t('loginError') + ': ' + err.message);
    } finally {
      setLoading('general', false);
    }
  }, [setChannels, setMovies, setSeries, setCategories, handleSuccess, handleError, clearMessages, setLoading, t]);

  // ================ HANDLE M3U LOAD ================
  const handleM3ULoad = useCallback(async (source) => {
    setLoading('general', true);
    clearMessages();
    
    try {
      let channels = [];
      
      if (source.channels) {
        channels = source.channels;
      } else if (source.type === 'file' || source.type === 'paste') {
        channels = parseM3U(source.content);
      } else {
        try {
          const m3uText = await fetchM3UFromUrl(source.url);
          channels = parseM3U(m3uText);
        } catch (error) {
          window.open(source.url, '_blank');
          handleSuccess(t('downloadingPlaylist') || '✅ Playlist po shkarkohet! Tani ngarko file-in nga M3UUploader.');
          setLoading('general', false);
          return;
        }
      }

      if (channels.length === 0) {
        throw new Error(t('noChannelsFound') || 'Nuk u gjet asnjë kanal në playlist');
      }

      setChannels(channels);
      setSourceType(SOURCE_TYPES.M3U);
      setShowM3UModal(false);
      setActiveTab(TABS.LIVE);
      setSelectedCategory(APP_CONSTANTS.DEFAULT_CATEGORY);
      
      handleSuccess(t('channelsLoaded', { count: channels.length }));
      
    } catch (err) {
      console.error('❌ M3U error:', err);
      handleError(err, err.message);
    } finally {
      setLoading('general', false);
    }
  }, [setChannels, handleSuccess, handleError, clearMessages, setLoading, t]);

  // ================ TOGGLE FAVORITE ================
  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  }, [setFavorites]);

  // ================ HANDLE LOGOUT ================
  const handleLogout = useCallback(() => {
    clearData();
    setXtreamCredentials(INITIAL_CREDENTIALS);
    setSourceType(null);
    setCurrentStream(null);
    setIsPlayerVisible(false);
    setIsPlaying(false);
    setActiveTab(TABS.LIVE);
    setSelectedCategory(APP_CONSTANTS.DEFAULT_CATEGORY);
    setCurrentPage(1);
    setEpgData([]);
    setCurrentEpg(null);
    setCurrentStreamInfo(null);
    setSelectedItem(null);
    setSearchQuery("");
    clearMessages();
  }, [clearData, clearMessages]);

  // ================ TOGGLE SIDEBAR ================
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // ================ HANDLE TAB CHANGE ================
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedCategory(APP_CONSTANTS.DEFAULT_CATEGORY);
    setCurrentPage(1);
  }, []);

  // ================ HANDLE SEARCH CLOSE ================
  const handleSearchClose = useCallback(() => {
    setShowSearchModal(false);
    setSearchQuery("");
  }, []);

  // ================ HANDLE CATEGORY CHANGE ================
  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  // ================ EFFECTS ================
  useEffect(() => {
    setShowM3UModal(!sourceType);
  }, [sourceType]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ================ GET CATEGORY COUNT ================
  const getCategoryCount = useCallback((category) => {
    let items = [];
    if (activeTab === TABS.LIVE) items = safeChannels;
    else if (activeTab === TABS.MOVIES) items = safeMovies;
    else if (activeTab === TABS.SERIES) items = safeSeries;
    
    if (!items || items.length === 0) return 0;
    
    if (category === APP_CONSTANTS.DEFAULT_CATEGORY) {
      return items.length;
    }
    
    return items.filter(item => {
      if (!item) return false;
      
      const itemCategory = 
        item.group_title ||        
        item.group ||             
        item.category_name ||     
        item.category ||          
        item.tvg_group ||        
        item.genre ||            
        'Pa Kategori';
      
      return itemCategory === category;
    }).length;
  }, [activeTab, safeChannels, safeMovies, safeSeries]);

  // ================ COMPUTED PROPERTIES ================
  const currentCategories = useMemo(() => {
    const categoriesSet = new Set();
    categoriesSet.add(APP_CONSTANTS.DEFAULT_CATEGORY);
    
    let items = [];
    if (activeTab === TABS.LIVE) items = safeChannels;
    else if (activeTab === TABS.MOVIES) items = safeMovies;
    else if (activeTab === TABS.SERIES) items = safeSeries;
    
    if (!items || items.length === 0) {
      return Array.from(categoriesSet);
    }
    
    items.forEach(item => {
      if (!item) return;
      
      let catName = 
        item.group_title || 
        item.group || 
        item.category_name || 
        item.category || 
        item.tvg_group || 
        item.genre;
      
      if (catName && typeof catName === 'string' && catName.trim() !== '') {
        categoriesSet.add(catName.trim());
      }
    });
    
    return Array.from(categoriesSet).sort((a, b) => {
      if (a === APP_CONSTANTS.DEFAULT_CATEGORY) return -1;
      if (b === APP_CONSTANTS.DEFAULT_CATEGORY) return 1;
      return a.localeCompare(b);
    });
  }, [activeTab, safeChannels, safeMovies, safeSeries]);

  const filteredItems = useMemo(() => {
    let items = [];
    if (activeTab === TABS.LIVE) items = safeChannels;
    else if (activeTab === TABS.MOVIES) items = safeMovies;
    else if (activeTab === TABS.SERIES) items = safeSeries;
    
    if (!items || !items.length) return [];
    
    if (selectedCategory === APP_CONSTANTS.DEFAULT_CATEGORY) {
      return items;
    }
    
    return items.filter(item => {
      if (!item) return false;
      
      const itemCategory = 
        item.group_title || 
        item.group || 
        item.category_name || 
        item.category || 
        item.tvg_group || 
        item.genre || 
        'Pa Kategori';
      
      return itemCategory === selectedCategory;
    });
  }, [activeTab, selectedCategory, safeChannels, safeMovies, safeSeries]);

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, currentPage * itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const searchedItems = useMemo(() => {
    if (!searchQuery) return paginatedItems;
    return searchItems(paginatedItems, searchQuery);
  }, [paginatedItems, searchQuery]);

  // ================ LOAD MORE ITEMS ================
  const loadMoreItems = useCallback(() => {
    if (currentPage * itemsPerPage < filteredItems.length) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, itemsPerPage, filteredItems.length]);

  const hasLiveContent = safeChannels?.length > 0;
  const hasMoviesContent = safeMovies?.length > 0;
  const hasSeriesContent = safeSeries?.length > 0;

  // ================ HANDLE PLAYER ERROR ================
  const handlePlayerError = useCallback((error) => {
    console.error('🎬 Player error:', error);
    
    let errorMessage = t('playerError');
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.type === 'videoError') {
        switch (error.code) {
          case 2:
            errorMessage = t('networkError');
            break;
          case 3:
            errorMessage = t('decodeError');
            break;
          case 4:
            errorMessage = t('formatNotSupported');
            break;
          default:
            errorMessage = t('videoError');
        }
      } else if (error.type === 'hlsError') {
        errorMessage = t('streamError') + ': ' + (error.message || error.details || '');
      } else if (error.type === 'authError') {
        errorMessage = t('unauthorized');
      }
    }
    
    handleError(
      error instanceof Error ? error : new Error(errorMessage), 
      errorMessage
    );
  }, [handleError, t]);

  // ================ RENDER ================
  if (!sourceType) {
    return (
      <ErrorBoundary>
        <WelcomeScreen
          theme={theme}
          showXtreamLogin={showXtreamLogin}
          showM3UModal={showM3UModal}
          onXtreamClick={() => {
            setShowXtreamLogin(true);
            setShowM3UModal(false);
          }}
          onM3UClick={() => {
            setShowM3UModal(true);
            setShowXtreamLogin(false);
          }}
          onXtreamLogin={handleXtreamLogin}
          onM3ULoad={handleM3ULoad}
          onCloseXtream={() => setShowXtreamLogin(false)}
          onCloseM3U={() => setShowM3UModal(false)}
          isLoading={isLoading.general}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`app theme-${theme}`} data-theme={theme}>
        {/* Modals */}
        {showXtreamLogin && (
          <XtreamLogin
            onLogin={handleXtreamLogin}
            onClose={() => setShowXtreamLogin(false)}
            isLoading={isLoading.general}
            theme={theme}
          />
        )}

        {showM3UModal && (
          <M3UUploader
            onLoad={handleM3ULoad}
            onClose={() => setShowM3UModal(false)}
            isLoading={isLoading.general}
            theme={theme}
          />
        )}

        <SearchModal
          isOpen={showSearchModal}
          query={searchQuery}
          setQuery={setSearchQuery}
          results={searchedItems.slice(0, APP_CONSTANTS.MAX_SEARCH_RESULTS)}
          onClose={handleSearchClose}
          onSelectStream={handlePlay}
          onToggleFavorite={toggleFavorite}
          favorites={favorites}
          theme={theme}
          activeTab={activeTab}
        />

        <Toast 
          error={error} 
          success={success} 
          onClose={clearMessages} 
          theme={theme}
        />

        {/* Header */}
        <header className="smart-header">
          <div className="smart-header-left">
            <button 
              className="smart-menu-btn" 
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? t('closeMenu') : t('openMenu')}
            >
              {isSidebarOpen ? '◀' : '▶'}
            </button>
            <h1 className="smart-logo">IPTV Player</h1>
            {sourceType && (
              <div className="smart-source">
                {sourceType === SOURCE_TYPES.XTREAM && (
                  <span className="smart-badge xtream">
                    <span className="badge-dot"></span>
                    {xtreamCredentials.username}
                  </span>
                )}
                {sourceType === SOURCE_TYPES.M3U && (
                  <span className="smart-badge m3u">
                    <span className="badge-dot"></span>
                    M3U • {safeChannels?.length || 0}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="smart-header-center">
            <button 
              className="smart-search" 
              onClick={() => setShowSearchModal(true)}
              aria-label={t('search')}
            >
              <span className="smart-search-icon">🔍</span>
              <span className="smart-search-text">
                {t('searchPlaceholder', { 
                  type: activeTab === TABS.LIVE ? t('channels') : 
                        activeTab === TABS.MOVIES ? t('movies') : t('series')
                })}
              </span>
              <span className="smart-search-hint">{t('searchHint')}</span>
            </button>
          </div>

          <div className="smart-header-right">
            <LanguageSelector theme={theme} />
            <button 
              className="smart-icon-btn theme-btn" 
              onClick={toggleTheme} 
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button 
              className="smart-icon-btn logout-btn" 
              onClick={handleLogout} 
              title={t('logout')}
              aria-label={t('logout')}
            >
              <span className="icon">🚪</span>
            </button>
          </div>
        </header>

        {/* Tabs */}
        {(hasLiveContent || hasMoviesContent || hasSeriesContent) && (
          <div className="smart-tabs">
            {hasLiveContent && (
              <button 
                className={`smart-tab ${activeTab === TABS.LIVE ? 'active' : ''}`}
                onClick={() => handleTabChange(TABS.LIVE)}
                aria-label={t('live')}
              >
                <span className="tab-icon">📺</span>
                <span className="tab-text">{t('live')}</span>
                <span className="tab-count">{safeChannels?.length || 0}</span>
              </button>
            )}
            {hasMoviesContent && (
              <button 
                className={`smart-tab ${activeTab === TABS.MOVIES ? 'active' : ''}`}
                onClick={() => handleTabChange(TABS.MOVIES)}
                aria-label={t('movies')}
              >
                <span className="tab-icon">🎬</span>
                <span className="tab-text">{t('movies')}</span>
                <span className="tab-count">{safeMovies?.length || 0}</span>
              </button>
            )}
            {hasSeriesContent && (
              <button 
                className={`smart-tab ${activeTab === TABS.SERIES ? 'active' : ''}`}
                onClick={() => handleTabChange(TABS.SERIES)}
                aria-label={t('series')}
              >
                <span className="tab-icon">📺</span>
                <span className="tab-text">{t('series')}</span>
                <span className="tab-count">{safeSeries?.length || 0}</span>
              </button>
            )}
          </div>
        )}

        {/* Player Section */}
        {isPlayerVisible && currentStream && (
          <section className="smart-player-section">
            <div className="smart-player-container">
              <div className="smart-player-header">
                <div className="smart-now-playing">
                  <img 
                    src={currentStreamInfo?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStreamInfo?.name || 'TV')}&size=48&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`}
                    alt={currentStreamInfo?.name}
                    className="smart-now-logo"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStreamInfo?.name || 'TV')}&size=48&background=${theme === 'dark' ? '1e293b' : 'e2e8f0'}&color=${theme === 'dark' ? 'fff' : '0f172a'}`;
                    }}
                  />
                  <div className="smart-now-info">
                    <span className="smart-now-label">
                      {currentStreamInfo?.type === STREAM_TYPES.LIVE ? t('live') : 
                       currentStreamInfo?.type === STREAM_TYPES.MOVIE ? t('movie') : 
                       currentStreamInfo?.type === STREAM_TYPES.SERIES ? t('series') : t('playing')}
                    </span>
                    <span className="smart-now-name">{currentStreamInfo?.name}</span>
                    {currentEpg && (
                      <span className="smart-now-epg">{currentEpg.title}</span>
                    )}
                  </div>
                </div>
                <button 
                  className="smart-close-btn" 
                  onClick={() => setIsPlayerVisible(false)}
                >
                  ✕
                </button>
              </div>
              
              <HlsPlayer
                src={currentStream}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onClose={() => setIsPlayerVisible(false)}
                onError={handlePlayerError}
                theme={theme}
                currentStreamInfo={currentStreamInfo}
                currentEpg={currentEpg}
                epgData={epgData}
                onEpgUpdate={setEpgData}
              />
            </div>
          </section>
        )}

        {/* Main Layout */}
        <div className="smart-layout">
          {/* Sidebar */}
          <aside className={`smart-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="smart-categories">
              <div className="smart-categories-header">
                <h3>{t('categories')}</h3>
                <span className="smart-category-count">
                  {currentCategories.length - 1}
                </span>
              </div>
              
              {currentCategories.length > 1 ? (
                <ul className="smart-category-list">
                  {currentCategories.map((category) => {
                    const count = getCategoryCount(category);
                    if (count === 0 && category !== APP_CONSTANTS.DEFAULT_CATEGORY) return null;
                    
                    return (
                      <li 
                        key={category}
                        className={`smart-category-item ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => handleCategoryChange(category)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleCategoryChange(category)}
                      >
                        <span className="smart-category-icon">
                          {category === APP_CONSTANTS.DEFAULT_CATEGORY ? '📋' : 
                           activeTab === TABS.LIVE ? '📺' : 
                           activeTab === TABS.MOVIES ? '🎬' : '📺'}
                        </span>
                        <span className="smart-category-name">
                          {category === APP_CONSTANTS.DEFAULT_CATEGORY 
                            ? activeTab === TABS.LIVE ? t('allChannels') :
                              activeTab === TABS.MOVIES ? t('allMovies') : t('allSeries')
                            : category}
                        </span>
                        <span className="smart-category-badge">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="smart-no-categories">
                  <p>{t('noCategories')}</p>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="smart-content">
            <div className="smart-content-header">
              <div className="smart-content-title">
                <span className="smart-content-icon">
                  {activeTab === TABS.LIVE ? '📺' : activeTab === TABS.MOVIES ? '🎬' : '📺'}
                </span>
                <h2>
                  {selectedCategory === APP_CONSTANTS.DEFAULT_CATEGORY 
                    ? activeTab === TABS.LIVE ? t('allChannels') :
                      activeTab === TABS.MOVIES ? t('allMovies') : t('allSeries')
                    : selectedCategory}
                </h2>
                <span className="smart-content-count">{filteredItems.length}</span>
              </div>
            </div>
            
            <ChannelListWithPagination
              items={paginatedItems || []}
              onPlay={handlePlay}
              onToggleFavorite={toggleFavorite}
              favorites={favorites || []}
              selectedItem={selectedItem}
              theme={theme}
              activeTab={activeTab}
              onLoadMore={loadMoreItems}
              hasMore={currentPage * itemsPerPage < filteredItems.length}
              isLoading={isLoading.channels}
            />
          </main>
        </div>

        {isLoading.general && <LoadingSpinner theme={theme} />}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
