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
  currentEpg
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const bufferTimerRef = useRef(null);
  const errorReportedRef = useRef(false);

  // Clean up buffer timer
  useEffect(() => () => clearTimeout(bufferTimerRef.current), []);

  // Raporton error vetëm një herë
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      onError({
        type: errorData?.type || 'unknown',
        message: errorData?.message || errorData?.details || 'Gabim i panjohur',
        code: errorData?.code,
        details: errorData?.details || errorData?.message
      });
      setTimeout(() => { errorReportedRef.current = false; }, 2000);
    }
  }, [onError]);

  const playVideo = useCallback(async () => {
    if (!videoRef.current) return false;
    try {
      await videoRef.current.play();
      setIsBuffering(false);
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError') setIsReady(true);
      else reportError({ type: 'playError', message: err.message });
      return false;
    }
  }, [reportError]);

  // Initialize player
  useEffect(() => {
    if (!src || !videoRef.current) return;

    let hls = null;
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    // Stream URL
    const streamUrl = src;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        try {
          hls = new Hls({ 
            enableWorker: true, 
            debug: false,
            xhrSetup: (xhr) => {
              // Vetëm headers të sigurta nga browser
              xhr.setRequestHeader('Accept', '*/*');
              xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
            }
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(streamUrl));

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            setIsReady(true);
            if (isPlaying) playVideo();
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setTimeout(() => hls.startLoad(), 2000);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  setError('Problem me stream-in.');
                  reportError({ type: 'hlsError', message: data.details });
                  break;
              }
            }
          });

          hls.attachMedia(videoRef.current);
        } catch (err) {
          setError('Nuk mund të inicializohet HLS player');
          reportError({ type: 'initError', message: err.message });
        }
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        videoRef.current.load();
        const onLoadedMetadata = () => { setIsReady(true); if (isPlaying) playVideo(); };
        const onError = () => reportError({ type: 'videoError', message: 'Safari HLS error' });
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.addEventListener('error', onError);
        return () => {
          videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current.removeEventListener('error', onError);
        };
      }
    } else {
      // Direct video (MP4, TS, ...)
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      const onCanPlay = () => { setIsReady(true); if (isPlaying) playVideo(); };
      const onError = () => reportError({ type: 'videoError', message: 'Format not supported or network error' });
      videoRef.current.addEventListener('canplay', onCanPlay);
      videoRef.current.addEventListener('error', onError);
      return () => {
        videoRef.current.removeEventListener('canplay', onCanPlay);
        videoRef.current.removeEventListener('error', onError);
      };
    }

    return () => { if (hls) { hls.destroy(); hlsRef.current = null; } };
  }, [src, isPlaying, playVideo, reportError]);

  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current || !isReady) return;
    if (isPlaying) playVideo();
    else videoRef.current.pause();
  }, [isPlaying, isReady, playVideo]);

  const handleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
      else if (videoRef.current.webkitRequestFullscreen) videoRef.current.webkitRequestFullscreen();
      else if (videoRef.current.msRequestFullscreen) videoRef.current.msRequestFullscreen();
    }
  }, []);

  const handleOpenDirect = useCallback(() => { window.open(src, '_blank'); }, [src]);

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

        {!isReady && !error && (
          <div className="player-loading">
            <div className="loading-spinner"></div>
            <p>Duke ngarkuar stream-in...</p>
          </div>
        )}

        {isBuffering && isReady && isPlaying && (
          <div className="player-buffering">
            <div className="buffering-spinner"></div>
            <p>Duke bufferuar...</p>
          </div>
        )}

        {error && (
          <div className="player-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={() => videoRef.current?.load()} className="retry-btn">Provo përsëri</button>
              <button onClick={handleOpenDirect} className="direct-link-btn">Hap në browser</button>
            </div>
          </div>
        )}

        {!isPlaying && isReady && !error && (
          <button className="play-btn-overlay" onClick={onPlayPause}>▶</button>
        )}

        {isReady && !error && (
          <button className="fullscreen-btn" onClick={handleFullscreen}>⛶</button>
        )}
      </div>

      {currentStreamInfo && (
        <div className="player-info">
          <div className="channel-info">
            {currentStreamInfo.logo && (
              <img 
                src={currentStreamInfo.logo} 
                alt={currentStreamInfo.name}
                className="channel-logo"
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
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
                {new Date(currentEpg.start_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
