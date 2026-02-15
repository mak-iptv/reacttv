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
  const [usingProxy, setUsingProxy] = useState(false);
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

  // Funksion për të krijuar një proxy CORS
  const createProxyUrl = useCallback((url) => {
    // Përdor një CORS proxy për të kaluar bllokimin
    // Kjo është një zgjidhje e përkohshme - për production përdor proxy-in tënd
    const corsProxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url='
    ];
    
    // Provo proxy të parë
    return corsProxies[0] + encodeURIComponent(url);
  }, []);

  // Funksioni startVideo i integruar
  const startVideo = useCallback((url, useProxy = false) => {
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

    // Përdor URL-në origjinale ose proxy
    let finalUrl = useProxy ? createProxyUrl(url) : url;
    
    // Kontrollo nëse jemi në HTTPS dhe URL është HTTP
    const isHttpsPage = window.location.protocol === 'https:';
    const isHttpUrl = finalUrl.startsWith('http:');
    
    if (isHttpsPage && isHttpUrl && !useProxy) {
      console.warn('⚠️ Mixed Content: HTTPS page loading HTTP resource');
      // Mos konverto automatikisht, por trego paralajmërim
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
            
            // Shto Referer dhe Origin për domain-e specifike
            if (url.includes('zdravahrana.dyndns.info')) {
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
          setRetryCount(0);
          setUsingProxy(useProxy);
          
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
                
                // Kontrollo nëse errori është për shkak të Mixed Content
                if (data.details === 'manifestLoadError' && !useProxy && retryCount < MAX_RETRIES) {
                  console.log('Provo me CORS proxy...');
                  setUsingProxy(true);
                  setTimeout(() => {
                    startVideo(url, true);
                  }, 1000);
                  return;
                }
                
                const delay = Math.min(2000 * (retryCount + 1), 10000);
                setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, delay);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.log('Fatal error - cannot recover');
                setError('Problem me stream-in');
                reportError({ 
                  type: 'hlsError', 
                  details: data.details || data.error?.message || 'Gabim i panjohur HLS' 
                });
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
      // Safari native HLS support
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setRetryCount(0);
      setUsingProxy(useProxy);
    } else if (!isHls) {
      // Direct video file (mp4, etc)
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setRetryCount(0);
      setUsingProxy(useProxy);
    } else {
      // HLS not supported
      setError('Shfletuesi juaj nuk mbështet HLS');
      reportError({ type: 'unsupported', details: 'HLS not supported' });
    }
  }, [isPlaying, reportError, retryCount, createProxyUrl]);

  // Initialize player when src changes
  useEffect(() => {
    if (!src || !videoRef.current) return;
    
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;
    setRetryCount(0);
    setUsingProxy(false);
    
    startVideo(src, false);
    
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
      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Play failed:', err);
          if (err.name === 'NotAllowedError') {
            setIsBuffering(false);
            onPlayPause?.();
          }
        });
      }
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
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = setTimeout(() => {
        setIsBuffering(false);
        if (retryCount < MAX_RETRIES) {
          handleRetry();
        }
      }, 10000);
    };

    const onPlaying = () => {
      setIsBuffering(false);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
    };

    const onError = () => {
      const videoError = player.error;
      if (videoError?.code) {
        let errorMessage = '';
        switch (videoError.code) {
          case 1:
            errorMessage = 'Anulim i ngarkimit të videos';
            break;
          case 2:
            errorMessage = 'Gabim rrjeti - kontrollo lidhjen';
            break;
          case 3:
            errorMessage = 'Dekodimi i videos dështoi';
            break;
          case 4:
            errorMessage = 'Formati i videos nuk mbështetet';
            break;
          default:
            errorMessage = 'Gabim i panjohur video';
        }
        setError(errorMessage);
        reportError({ type: 'videoError', code: videoError.code, details: errorMessage });
      }
    };

    const onStalled = () => {
      console.log('Video stalled');
      setIsBuffering(true);
    };

    player.addEventListener('waiting', onWaiting);
    player.addEventListener('playing', onPlaying);
    player.addEventListener('error', onError);
    player.addEventListener('stalled', onStalled);
    player.addEventListener('canplay', () => {
      setIsBuffering(false);
    });

    return () => {
      player.removeEventListener('waiting', onWaiting);
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('error', onError);
      player.removeEventListener('stalled', onStalled);
    };
  }, [reportError, retryCount]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setError('Nuk mund të luhet stream-i. Provo një tjetër.');
      return;
    }

    setRetryCount(prev => prev + 1);
    setError(null);
    errorReportedRef.current = false;
    setIsBuffering(false);
    
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
      
      // Provo me proxy nëse është hera e dytë
      const useProxy = retryCount >= 1;
      setTimeout(() => {
        if (src) startVideo(src, useProxy);
      }, 1000);
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
      } else if (videoRef.current.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      }
    }
  }, []);

  const handleNativeControls = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.controls = true;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.controls = false;
        }
      }, 3000);
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
          controls={false}
          preload="auto"
          poster={currentStreamInfo?.logo}
          crossOrigin="anonymous"
        />
        
        {/* Loading Indicator */}
        {!isReady && !error && (
          <div className="player-loading">
            <div className="loading-spinner"></div>
            <p>Duke ngarkuar stream-in...</p>
            {usingProxy && <p className="proxy-note">Duke përdorur CORS proxy...</p>}
          </div>
        )}
        
        {/* Buffering Indicator */}
        {isBuffering && isReady && isPlaying && (
          <div className="player-buffering">
            <div className="buffering-spinner"></div>
            <p>Duke bufferuar... ({retryCount}/{MAX_RETRIES})</p>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="player-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <p className="error-detail">Mixed Content: HTTPS page cannot load HTTP resource</p>
            <div className="error-actions">
              <button onClick={handleRetry} className="retry-btn">
                Provo përsëri
              </button>
              <button onClick={() => window.open(src, '_blank')} className="direct-link-btn">
                Hap në browser
              </button>
              <button onClick={handleNativeControls} className="controls-btn">
                Trego kontrollet
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
                loading="lazy"
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
                {currentEpg.start_timestamp ? new Date(currentEpg.start_timestamp * 1000).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
