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
      }
      return false;
    }
  }, []);

  // Initialize player
  useEffect(() => {
    if (!src || !videoRef.current) return;

    let hls = null;
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Detekto llojin e stream-it
    const isHlsStream = src.includes('.m3u8') || src.includes('playlist.m3u8');
    
    console.log('🎬 Loading stream:', { 
      src: src.substring(0, 100), 
      isHlsStream,
      type: isHlsStream ? 'HLS' : 'Direct'
    });

    // Për HLS streams - GJITHMONË përdor HLS.js për .m3u8
    if (isHlsStream) {
      console.log('🎬 Using HLS.js for m3u8 stream');
      
      if (Hls.isSupported()) {
        try {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 60,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 50 * 1000 * 1000,
            maxBufferHole: 0.5,
            manifestLoadingTimeOut: 20000,
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 1000,
            manifestLoadingMaxRetryTimeout: 60000,
            levelLoadingTimeOut: 20000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1000,
            levelLoadingMaxRetryTimeout: 60000,
            fragLoadingTimeOut: 30000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 1000,
            fragLoadingMaxRetryTimeout: 60000,
            startLevel: -1,
            debug: false,
            xhrSetup: (xhr, url) => {
              // Shto headers për Xtream
              if (url.includes('balkan-x.net')) {
                xhr.withCredentials = false;
                // Shto referrer dhe origin
                xhr.setRequestHeader('Referer', 'http://balkan-x.net/');
                xhr.setRequestHeader('Origin', 'http://balkan-x.net');
              }
            }
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('✅ HLS media attached');
            hls.loadSource(src);
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
            
            // 401 Unauthorized error
            if (data.response?.code === 401 || data.details?.includes('401')) {
              setError('Nuk keni autorizim për këtë stream. Kontrollo kredencialet.');
              reportError({ 
                type: 'authError', 
                message: 'Unauthorized - 401',
                details: 'Kredenciale të pavlefshme ose të skaduara'
              });
              return;
            }
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('Network error, trying to recover...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('Media error, trying to recover...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.log('Fatal error, cannot recover');
                  setError('Problem me stream-in. Provo përsëri.');
                  reportError({ 
                    type: 'hlsError', 
                    message: `HLS Error: ${data.type}`,
                    details: data.details 
                  });
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
        videoRef.current.src = src;
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
          
          if (videoError?.code === 4) {
            setError('Nuk keni autorizim për këtë stream');
            reportError({ type: 'authError', message: 'Unauthorized' });
          }
        };
        
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.addEventListener('error', onError);
        
        return () => {
          videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current?.removeEventListener('error', onError);
        };
      } else {
        setError('HLS nuk mbështetet në këtë browser');
        reportError({ type: 'notSupported', message: 'HLS not supported' });
      }
    } else {
      // Për video direkte (MP4, TS, etj)
      console.log('🎬 Using direct video playback');
      videoRef.current.src = src;
      videoRef.current.load();
      
      const onCanPlay = () => {
        setIsReady(true);
        if (isPlaying) {
          playVideo();
        }
      };

      const onError = () => {
        const videoError = videoRef.current?.error;
        console.error('Direct video error:', videoError);
        
        if (videoError?.code === 4) {
          setError('Formati i videos nuk mbështetet ose nuk keni autorizim');
          reportError({ type: 'videoError', message: 'Format not supported or unauthorized' });
        }
      };

      videoRef.current.addEventListener('canplay', onCanPlay);
      videoRef.current.addEventListener('error', onError);
      
      return () => {
        videoRef.current?.removeEventListener('canplay', onCanPlay);
        videoRef.current?.removeEventListener('error', onError);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, isPlaying, playVideo, reportError]);

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
    errorReportedRef.current = false;
    
    // Reload HLS
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
      }, 100);
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
            <button onClick={handleRetry} className="retry-btn">
              Provo përsëri
            </button>
            <button 
              onClick={() => window.open(src, '_blank')} 
              className="direct-link-btn"
            >
              Hap në browser
            </button>
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