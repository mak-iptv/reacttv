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
  const bufferTimerRef = useRef(null);
  const errorReportedRef = useRef(false);
  const MAX_RETRIES = 3;

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

  // Funksioni startVideo i integruar
  const startVideo = useCallback((url) => {
    const player = videoRef.current;
    if (!player) return;

    // Pastro HLS instance nëse ekziston
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('Gabim gjatë pastrimit të HLS:', e);
      }
      hlsRef.current = null;
    }

    // Konverto HTTP në HTTPS nëse jemi në HTTPS
    let finalUrl = url;
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
      console.log('🔄 Konverto HTTP në HTTPS:', url);
      finalUrl = url.replace('http://', 'https://');
    }

    console.log('🎬 Start video:', finalUrl.substring(0, 100) + '...');

    // Kontrollo nëse është HLS stream
    const isHls = finalUrl.includes('.m3u8') || finalUrl.includes('playlist.m3u8');

    if (isHls && Hls.isSupported()) {
      try {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 5,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 4,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 4,
          startLevel: -1,
          debug: false,
          xhrSetup: (xhr, url) => {
            xhr.setRequestHeader('Accept', '*/*');
            xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
            xhr.setRequestHeader('User-Agent', navigator.userAgent);
            
            if (url.includes('panther-tv.com') || url.includes('balkan-x.net')) {
              xhr.setRequestHeader('Referer', 'https://google.com/');
              xhr.setRequestHeader('Origin', 'https://google.com');
            }
          }
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('✅ HLS media attached');
          hls.loadSource(finalUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('✅ HLS manifest parsed, levels:', data.levels.length);
          setIsReady(true);
          setError(null);
          
          if (isPlaying) {
            player.play().catch(e => console.warn('Play failed:', e));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                setTimeout(() => hls.startLoad(), 2000);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.log('Fatal error');
                setError('Problem me stream-in');
                reportError({ type: 'hlsError', details: data.details });
                break;
            }
          }
        });

        hls.attachMedia(player);
        
      } catch (err) {
        console.error('HLS init error:', err);
        player.src = finalUrl;
        player.load();
      }
    } else if (isHls && player.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari
      player.src = finalUrl;
      player.load();
      setIsReady(true);
    } else {
      // Direct video
      player.src = finalUrl;
      player.load();
      setIsReady(true);
    }
  }, [isPlaying, reportError]);

  // Initialize player when src changes
  useEffect(() => {
    if (!src || !videoRef.current) return;
    
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;
    
    startVideo(src);
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, startVideo]);

  // Handle play/pause
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !isReady) return;

    if (isPlaying) {
      player.play().catch(err => {
        console.warn('Play failed:', err);
        if (err.name === 'NotAllowedError') {
          onPlayPause?.();
        }
      });
    } else {
      player.pause();
    }
  }, [isPlaying, isReady, onPlayPause]);

  // Video event listeners
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const onWaiting = () => {
      setIsBuffering(true);
      bufferTimerRef.current = setTimeout(() => setIsBuffering(false), 10000);
    };

    const onPlaying = () => {
      setIsBuffering(false);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };

    const onError = () => {
      const videoError = player.error;
      if (videoError?.code === 4) {
        setError('Formati i videos nuk mbështetet');
        reportError({ type: 'videoError', code: 4 });
      }
    };

    player.addEventListener('waiting', onWaiting);
    player.addEventListener('playing', onPlaying);
    player.addEventListener('error', onError);

    return () => {
      player.removeEventListener('waiting', onWaiting);
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('error', onError);
    };
  }, [reportError]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setError('Nuk mund të luhet stream-i. Provo një tjetër.');
      return;
    }

    setRetryCount(prev => prev + 1);
    setError(null);
    errorReportedRef.current = false;
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
      setTimeout(() => startVideo(src), 500);
    }
  }, [retryCount, src, startVideo]);

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
              <button onClick={() => window.open(src, '_blank')} className="direct-link-btn">
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
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
