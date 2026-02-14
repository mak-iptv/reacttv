import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import PropTypes from 'prop-types';
import './HlsPlayer.css';

const HlsPlayer = ({ 
  src, 
  isPlaying, 
  onPlayPause, 
  onClose, 
  onError,
  theme = 'dark',
  currentStreamInfo,
  currentEpg
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  const bufferTimerRef = useRef(null);
  const errorReportedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const MAX_RETRIES = 3;

  // Funksioni për marrjen e mesazhit të gabimit
  const getErrorMessage = (error) => {
    if (!error) return 'Gabim i panjohur';
    
    if (error.message?.includes('Network') || error.type === Hls.ErrorTypes.NETWORK_ERROR) {
      return 'Probleme me rrjetin. Kontrollo lidhjen.';
    } else if (error.message?.includes('CORS')) {
      return 'Problem me CORS. Stream-i nuk lejohet.';
    } else if (error.type === 'mediaError' || error.type === Hls.ErrorTypes.MEDIA_ERROR) {
      return 'Formati i videos nuk mbështetet.';
    } else if (error.code === 4) {
      return 'Stream-i nuk u gjet ose është offline.';
    }
    return 'Gabim gjatë transmetimit';
  };

  // Raportimi i gabimeve
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      const errorMessage = getErrorMessage(errorData);
      onError({
        type: errorData?.type || 'unknown',
        message: errorMessage,
        details: errorData?.details || errorData
      });
      setTimeout(() => { errorReportedRef.current = false; }, 3000);
    }
  }, [onError]);

  // Funksioni kryesor i nisjes së videos
  const startVideo = useCallback((url) => {
    const player = videoRef.current;
    if (!player || !url) return;

    // Pastrim i timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // 1. Pastrim i plotë i instancës ekzistuese
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    player.pause();
    player.src = ""; // Liron memorien e browser-it
    player.load();

    // 2. Trajtimi i URL-ve (Mixed Content)
    let finalUrl = url;
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
      finalUrl = url.replace('http://', 'https://');
    }

    // 3. Kontrolli i teknologjisë (HLS.js vs Native)
    const isM3U8 = finalUrl.includes('.m3u8');

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 5,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 10000,
        xhrSetup: (xhr) => {
          // Disa providera IPTV kërkojnë headers specifikë
          if (url.includes('panther-tv') || url.includes('balkan-x')) {
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          }
          // Shto user-agent për disa stream-e
          xhr.setRequestHeader('User-Agent', window.navigator.userAgent);
        }
      });

      hls.loadSource(finalUrl);
      hls.attachMedia(player);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        setError(null);
        setRetryCount(0);
        if (isPlaying) {
          player.play().catch((err) => {
            console.warn('Auto-play u ndalua:', err);
            onPlayPause?.();
          });
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('Cilësia e re e ngarkuar:', data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Gabim rrjeti, duke u munduar të rifilloj...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Gabim media, duke u munduar të riparoj...');
              hls.recoverMediaError();
              break;
            default:
              setError(getErrorMessage(data));
              reportError(data);
              hls.destroy();
              break;
          }
        } else {
          // Gabime jo-fatale
          console.warn('Gabim jo-fatale HLS:', data);
        }
      });
    } 
    // Mbështetja për Safari (iOS/Mac)
    else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = finalUrl;
      player.addEventListener('loadedmetadata', () => {
        setIsReady(true);
        setError(null);
        if (isPlaying) player.play().catch(() => {});
      });
      
      player.addEventListener('error', (e) => {
        setError(getErrorMessage(e.target.error));
        reportError(e.target.error);
      });
    }
    // Formate të tjera (mp4, etj)
    else {
      player.src = finalUrl;
      setIsReady(true);
      
      player.addEventListener('error', (e) => {
        setError(getErrorMessage(e.target.error));
        reportError(e.target.error);
      });
    }
  }, [isPlaying, reportError, onPlayPause]);

  // Efekti kur ndryshon burimi (src)
  useEffect(() => {
    setIsReady(false);
    setError(null);
    setRetryCount(0);
    errorReportedRef.current = false;
    
    if (src) {
      startVideo(src);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [src, startVideo]);

  // Kontrolli Play/Pause
  useEffect(() => {
    if (!videoRef.current || !isReady) return;
    
    if (isPlaying) {
      videoRef.current.play().catch((err) => {
        console.warn('Nuk mund të luhet video:', err);
        onPlayPause?.();
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isReady, onPlayPause]);

  // Eventet e buffering
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const handleWaiting = () => {
      setIsBuffering(true);
      
      // Auto-reconnect nëse buffering zgjat shumë
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      reconnectTimerRef.current = setTimeout(() => {
        if (isBuffering && isPlaying && !error && src) {
          console.log('Buffering zgjat shumë, duke u rilidhur...');
          startVideo(src);
        }
      }, 10000); // 10 sekonda buffering => reconnect
    };
    
    const handlePlaying = () => {
      setIsBuffering(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    
    const handleStalled = () => {
      setIsBuffering(true);
    };
    
    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    player.addEventListener('waiting', handleWaiting);
    player.addEventListener('playing', handlePlaying);
    player.addEventListener('stalled', handleStalled);
    player.addEventListener('canplay', handleCanPlay);
    player.addEventListener('canplaythrough', handleCanPlay);

    return () => {
      player.removeEventListener('waiting', handleWaiting);
      player.removeEventListener('playing', handlePlaying);
      player.removeEventListener('stalled', handleStalled);
      player.removeEventListener('canplay', handleCanPlay);
      player.removeEventListener('canplaythrough', handleCanPlay);
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isBuffering, isPlaying, error, src, startVideo]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!videoRef.current || !isReady) return;
      
      // Mos i aktivizo nëse ka input/element tjetër të fokusuar
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case ' ':
        case 'Space':
          e.preventDefault();
          onPlayPause?.();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted(prev => !prev);
          if (videoRef.current) {
            videoRef.current.muted = !isMuted;
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const newVolume = Math.min(1, prev + 0.1);
            if (videoRef.current) {
              videoRef.current.volume = newVolume;
            }
            return newVolume;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const newVolume = Math.max(0, prev - 0.1);
            if (videoRef.current) {
              videoRef.current.volume = newVolume;
            }
            return newVolume;
          });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            videoRef.current.requestFullscreen();
          }
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onPlayPause, isReady, isMuted]);

  // Volume sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setError(null);
      errorReportedRef.current = false;
      startVideo(src);
    } else {
      setError("Pati një problem të përsëritur. Provo kanal tjetër.");
    }
  };

  const handleClose = () => {
    if (onClose) {
      // Pastro para se të mbyllësh
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
      
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      onClose();
    }
  };

  if (!src) return null;

  return (
    <div className={`hls-player hls-player--${theme}`}>
      <div className="hls-player__container">
        {/* Close button */}
        {onClose && (
          <button 
            className="hls-player__close-btn" 
            onClick={handleClose}
            aria-label="Mbyll"
          >
            ×
          </button>
        )}
        
        <video
          ref={videoRef}
          className="hls-player__video"
          playsInline
          controls={showControls}
          poster={currentStreamInfo?.logo}
          crossOrigin="anonymous"
          onClick={() => setShowControls(prev => !prev)}
          onDoubleClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              videoRef.current?.requestFullscreen();
            }
          }}
        />

        {/* Shfaqja e Loading */}
        {!isReady && !error && (
          <div className="hls-player__overlay hls-player__overlay--loading">
            <div className="hls-player__spinner"></div>
            <p className="hls-player__message">Duke u lidhur...</p>
            <p className="hls-player__submessage">{currentStreamInfo?.name}</p>
          </div>
        )}

        {/* Shfaqja e Gabimit */}
        {error && (
          <div className="hls-player__overlay hls-player__overlay--error">
            <div className="hls-player__error-icon">⚠️</div>
            <p className="hls-player__message">{error}</p>
            {retryCount < MAX_RETRIES && (
              <button 
                onClick={handleRetry} 
                className="hls-player__retry-btn"
              >
                Provo përsëri ({MAX_RETRIES - retryCount})
              </button>
            )}
            {onClose && (
              <button 
                onClick={handleClose} 
                className="hls-player__close-overlay-btn"
              >
                Mbyll
              </button>
            )}
          </div>
        )}

        {/* Buffering */}
        {isBuffering && isReady && !error && (
          <div className="hls-player__buffering">
            <div className="hls-player__buffering-spinner"></div>
            <span>Duke缓冲uar...</span>
          </div>
        )}

        {/* Volume indicator (kur ndryshon) */}
        {showControls && (
          <div className="hls-player__volume-indicator">
            <span>{Math.round(volume * 100)}%</span>
          </div>
        )}
      </div>

      {/* Info Paneli poshtë videos */}
      {currentStreamInfo && (
        <div className="hls-player__footer">
          <div className="hls-player__channel-meta">
            {currentStreamInfo.logo && (
              <img 
                src={currentStreamInfo.logo} 
                alt="" 
                className="hls-player__channel-logo"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <div className="hls-player__channel-info">
              <h3 className="hls-player__channel-name">{currentStreamInfo.name}</h3>
              <p className="hls-player__epg-info">
                {currentEpg?.title || 'Nuk ka informacion EPG'}
                {currentEpg?.start && currentEpg?.end && (
                  <span className="hls-player__epg-time">
                    {' '}· {new Date(currentEpg.start).toLocaleTimeString()} - {new Date(currentEpg.end).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Kontrollet e volumit */}
          <div className="hls-player__volume-control">
            <button 
              className="hls-player__volume-btn"
              onClick={() => setIsMuted(prev => !prev)}
            >
              {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                setIsMuted(val === 0);
              }}
              className="hls-player__volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
};

HlsPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  isPlaying: PropTypes.bool,
  onPlayPause: PropTypes.func,
  onClose: PropTypes.func,
  onError: PropTypes.func,
  theme: PropTypes.oneOf(['dark', 'light']),
  currentStreamInfo: PropTypes.shape({
    name: PropTypes.string,
    logo: PropTypes.string
  }),
  currentEpg: PropTypes.shape({
    title: PropTypes.string,
    start: PropTypes.string,
    end: PropTypes.string
  })
};

HlsPlayer.defaultProps = {
  isPlaying: false,
  theme: 'dark'
};

export default HlsPlayer;
