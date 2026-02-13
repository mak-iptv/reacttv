// src/components/HlsPlayer.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import './HlsPlayer.css';

const HlsPlayer = ({ 
  src, 
  isPlaying, 
  onPlayPause, 
  onClose, 
  onError,
  theme,
  currentStreamInfo,
  currentEpg,
  epgData,
  onEpgUpdate
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const [usingProxy, setUsingProxy] = useState(false);
  const [proxyAttempts, setProxyAttempts] = useState(0);
  const bufferTimerRef = useRef(null);
  const errorReportedRef = useRef(false);
  const MAX_RETRIES = 3;
  const MAX_PROXY_ATTEMPTS = 3;

  // Lista e proxy-ve për të provuar
  const PROXY_SERVICES = [
    { name: 'corsproxy.io', url: (target) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'allorigins.win', url: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
    { name: 'cors-anywhere', url: (target) => `https://cors-anywhere.herokuapp.com/${target}` },
    { name: 'thingproxy', url: (target) => `https://thingproxy.freeboard.io/fetch/${target}` },
    { name: 'codetabs', url: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}` }
  ];

  // Proxy URL function
  const getProxyUrl = useCallback((url, attempt = 0) => {
    if (!url) return url;
    
    // Nëse është HTTP dhe jemi në HTTPS, përdor proxy
    if (url.startsWith('http://') && window.location.protocol === 'https:') {
      console.log('🔄 Using proxy for HTTP URL:', url);
      
      // Provo proxy të ndryshme
      if (attempt < PROXY_SERVICES.length) {
        const proxy = PROXY_SERVICES[attempt];
        console.log(`Trying proxy ${attempt + 1}: ${proxy.name}`);
        return proxy.url(url);
      }
      
      // Konverto HTTP në HTTPS nëse është e mundur
      const httpsUrl = url.replace('http://', 'https://');
      console.log('🔄 Trying HTTPS instead of HTTP:', httpsUrl);
      return httpsUrl;
    }
    
    return url;
  }, []);

  // Clean up buffer timer
  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  // Funksion për të raportuar error vetëm një herë
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      
      const error = {
        type: errorData?.type || 'unknown',
        message: errorData?.message || errorData?.details || 'Gabim i panjohur',
        code: errorData?.code,
        details: errorData?.details || errorData?.message
      };
      
      onError(error);
      
      setTimeout(() => {
        errorReportedRef.current = false;
      }, 2000);
    }
  }, [onError]);

  // Funksion për të luajtur videon
  const playVideo = useCallback(async () => {
    if (!videoRef.current) return false;
    
    try {
      await videoRef.current.play();
      console.log('▶️ Playing successfully');
      setIsBuffering(false);
      return true;
    } catch (err) {
      console.warn('Play failed:', err);
      if (err.name === 'NotAllowedError') {
        setIsReady(true);
      } else if (err.name === 'NotSupportedError') {
        setError('Formati i videos nuk mbështetet');
        reportError({ type: 'notSupported', message: err.message });
      }
      return false;
    }
  }, [reportError]);

  // Funksion për të provuar me video direkt
  const tryDirectPlayback = useCallback(() => {
    console.log('🎬 Trying direct video playback');
    setError(null);
    setUsingProxy(false);
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.src = src;
      videoRef.current.load();
      
      videoRef.current.addEventListener('canplay', () => {
        setIsReady(true);
        if (isPlaying) {
          playVideo();
        }
      }, { once: true });
      
      videoRef.current.addEventListener('error', (e) => {
        const videoError = videoRef.current?.error;
        console.error('Direct playback error:', videoError);
        
        if (videoError?.code === 4) {
          setError('Formati i videos nuk mbështetet');
        } else {
          setError('Nuk mund të luhet video direkt');
        }
      }, { once: true });
    }
  }, [src, isPlaying, playVideo]);

  // Initialize player
  useEffect(() => {
    if (!src || !videoRef.current) return;

    let hls = null;
    let currentProxyAttempt = proxyAttempts;
    
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Përdor proxy nëse është e nevojshme
    const streamUrl = getProxyUrl(src, currentProxyAttempt);
    
    console.log('🎬 Loading stream:', { 
      original: src.substring(0, 100),
      using: streamUrl.substring(0, 100),
      isHls: streamUrl.includes('.m3u8'),
      usingProxy: currentProxyAttempt > 0,
      proxyAttempt: currentProxyAttempt
    });

    // Për HLS streams
    if (streamUrl.includes('.m3u8') || streamUrl.includes('playlist.m3u8')) {
      console.log('🎬 Using HLS.js for m3u8 stream');
      
      if (Hls.isSupported()) {
        try {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 60,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 50 * 1000 * 1000,
            maxBufferHole: 0.5,
            manifestLoadingTimeOut: 30000,
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 2000,
            manifestLoadingMaxRetryTimeout: 60000,
            levelLoadingTimeOut: 30000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 2000,
            levelLoadingMaxRetryTimeout: 60000,
            fragLoadingTimeOut: 40000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 2000,
            fragLoadingMaxRetryTimeout: 60000,
            startLevel: -1,
            debug: false,
            xhrSetup: (xhr, url) => {
              xhr.setRequestHeader('Accept', '*/*');
              xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
              xhr.setRequestHeader('User-Agent', navigator.userAgent);
              xhr.withCredentials = false;
              
              // Shto referrer për disa stream-e
              if (url.includes('panther-tv.com') || url.includes('balkan-x.net')) {
                xhr.setRequestHeader('Referer', 'https://google.com/');
                xhr.setRequestHeader('Origin', 'https://google.com');
              }
            }
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('✅ HLS media attached');
            hls.loadSource(streamUrl);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('✅ HLS manifest parsed, levels:', data.levels.length);
            setIsReady(true);
            setError(null);
            
            if (isPlaying) {
              playVideo();
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ HLS error:', {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              response: data.response
            });
            
            // Manifest parsing error
            if (data.details === 'manifestParsingError') {
              console.warn('⚠️ Manifest parsing error. Manifest might be invalid or protected.');
              
              // Provo me proxy tjetër
              if (currentProxyAttempt < PROXY_SERVICES.length - 1) {
                console.log(`Trying next proxy (${currentProxyAttempt + 2}/${PROXY_SERVICES.length})`);
                setProxyAttempts(prev => prev + 1);
                
                if (hls) {
                  hls.destroy();
                }
                
                // Reload with next proxy
                setTimeout(() => {
                  if (videoRef.current) {
                    const nextProxyUrl = getProxyUrl(src, currentProxyAttempt + 1);
                    videoRef.current.src = '';
                    videoRef.current.load();
                    
                    const newHls = new Hls({ ...hls.config });
                    newHls.loadSource(nextProxyUrl);
                    newHls.attachMedia(videoRef.current);
                    hlsRef.current = newHls;
                  }
                }, 1000);
                return;
              }
              
              // Nëse asnjë proxy nuk funksionon, provo video direkt
              setError('Nuk mund të lexohet playlist-i. Duke provuar video direkt...');
              setTimeout(() => {
                tryDirectPlayback();
              }, 1500);
              return;
            }
            
            // Mixed content error
            if (data.response?.url && data.response.url.startsWith('http:') && window.location.protocol === 'https:') {
              console.warn('⚠️ Mixed content detected.');
              
              if (currentProxyAttempt < PROXY_SERVICES.length - 1) {
                setProxyAttempts(prev => prev + 1);
                return;
              }
            }
            
            // 401 Unauthorized
            if (data.response?.code === 401 || data.details?.includes('401')) {
              setError('Nuk keni autorizim për këtë stream.');
              reportError({ type: 'authError', message: 'Unauthorized' });
              return;
            }
            
            // CORS error
            if (data.details === 'manifestLoadError' && data.response?.code === 0) {
              console.warn('⚠️ CORS error detected');
              
              if (currentProxyAttempt < PROXY_SERVICES.length - 1) {
                setProxyAttempts(prev => prev + 1);
                return;
              }
            }
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error, trying to recover...');
                  setTimeout(() => {
                    hls.startLoad();
                  }, 2000);
                  break;
                  
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error, trying to recover...');
                  hls.recoverMediaError();
                  break;
                  
                default:
                  console.log('Fatal error, cannot recover');
                  setError('Problem me stream-in. Duke provuar metodë alternative...');
                  setTimeout(tryDirectPlayback, 1000);
                  break;
              }
            }
          });

          hls.attachMedia(videoRef.current);
          
        } catch (err) {
          console.error('Failed to initialize HLS:', err);
          setError('Nuk mund të inicializohet HLS player');
          reportError({ type: 'initError', message: err.message });
        }
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        console.log('🎬 Using Safari native HLS');
        videoRef.current.src = streamUrl;
        videoRef.current.load();
        
        const onLoadedMetadata = () => {
          setIsReady(true);
          if (isPlaying) {
            playVideo();
          }
        };
        
        const onError = () => {
          const videoError = videoRef.current?.error;
          console.error('Safari HLS error:', videoError);
          
          if (currentProxyAttempt < PROXY_SERVICES.length - 1) {
            setProxyAttempts(prev => prev + 1);
          } else {
            setError('Nuk mund të luhet stream-i në Safari');
          }
        };
        
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.addEventListener('error', onError);
        
        return () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current?.removeEventListener('error', onError);
        };
      } else {
        tryDirectPlayback();
      }
    } else {
      tryDirectPlayback();
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, isPlaying, playVideo, reportError, getProxyUrl, proxyAttempts, tryDirectPlayback]);

  // Handle play/pause separately
  useEffect(() => {
    if (!videoRef.current || !isReady) return;

    if (isPlaying) {
      playVideo();
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isReady, playVideo]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setError('Nuk mund të luhet stream-i. Provo një tjetër.');
      return;
    }

    setRetryCount(prev => prev + 1);
    setError(null);
    setProxyAttempts(0);
    setUsingProxy(false);
    errorReportedRef.current = false;
    
    // Reload
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = src;
          videoRef.current.load();
        }
      }, 500);
    }
  }, [retryCount, src]);

  const handleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  }, []);

  const handleOpenDirect = useCallback(() => {
    window.open(src, '_blank');
  }, [src]);

  const handleNextProxy = useCallback(() => {
    setProxyAttempts(prev => prev + 1);
    setError(null);
  }, []);

  if (!src) return null;

  return (
    <div className={`hls-player theme-${theme}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          playsInline
          controls={true}
          preload="auto"
          poster={currentStreamInfo?.logo}
          crossOrigin="anonymous"
        />
        
        {/* Loading Indicator */}
        {!isReady && !error && (
          <div className="player-loading">
            <div className="loading-spinner"></div>
            <p>Duke ngarkuar stream-in...</p>
            {proxyAttempts > 0 && (
              <p className="proxy-info">
                Duke provuar metodën {proxyAttempts + 1}/{PROXY_SERVICES.length}...
              </p>
            )}
          </div>
        )}
        
        {/* Buffering Indicator */}
        {isBuffering && isReady && isPlaying && (
          <div className="player-buffering">
            <div className="buffering-spinner"></div>
            <p>Duke bufferuar...</p>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="player-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={handleRetry} className="retry-btn">
                Provo përsëri
              </button>
              {proxyAttempts < PROXY_SERVICES.length - 1 && (
                <button onClick={handleNextProxy} className="proxy-btn">
                  Provo metodë tjetër
                </button>
              )}
              <button onClick={handleOpenDirect} className="direct-link-btn">
                Hap në browser
              </button>
            </div>
          </div>
        )}
        
        {/* Play Button Overlay */}
        {!isPlaying && isReady && !error && (
          <button className="play-btn-overlay" onClick={onPlayPause}>
            ▶
          </button>
        )}

        {/* Fullscreen Button */}
        {isReady && !error && (
          <button className="fullscreen-btn" onClick={handleFullscreen}>
            ⛶
          </button>
        )}
      </div>

      {/* Channel Info */}
      {currentStreamInfo && (
        <div className="player-info">
          <div className="channel-info">
            {currentStreamInfo.logo && (
              <img 
                src={currentStreamInfo.logo} 
                alt={currentStreamInfo.name}
                className="channel-logo"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="channel-details">
              <span className="channel-name">{currentStreamInfo.name}</span>
              <span className="channel-category">{currentStreamInfo.category}</span>
            </div>
          </div>
          
          {currentEpg && (
            <div className="epg-info">
              <span className="epg-title">{currentEpg.title}</span>
              <span className="epg-time">
                {new Date(currentEpg.start_timestamp * 1000).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          )}
          
          {proxyAttempts > 0 && (
            <div className="proxy-badge">
              Proxy {proxyAttempts + 1}/{PROXY_SERVICES.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
