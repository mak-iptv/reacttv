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
  const [usingProxy, setUsingProxy] = useState(false);
  const MAX_RETRIES = 3;

  // Clean up buffer timer
  useEffect(() => () => bufferTimerRef.current && clearTimeout(bufferTimerRef.current), []);

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

  // Krijon proxy URL për HTTP -> HTTPS
  const createProxyUrl = useCallback((url) => {
    return `/api/stream?url=${encodeURIComponent(url)}`;
  }, []);

  // Funksioni kryesor për start video
  const startVideo = useCallback((url, useProxy = false) => {
    const player = videoRef.current;
    if (!player) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let finalUrl = useProxy ? createProxyUrl(url) : url;
    const isHttpsPage = window.location.protocol === 'https:';
    const isHttpUrl = finalUrl.startsWith('http:');

    if (isHttpsPage && isHttpUrl && !useProxy) {
      console.warn('⚠️ Mixed Content: HTTPS page loading HTTP resource');
    }

    console.log('🎬 Start video:', finalUrl.substring(0, 100) + '...');

    const isHls = finalUrl.includes('.m3u8');

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
          debug: false
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(finalUrl));

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('✅ HLS manifest parsed, levels:', data.levels.length);
          setIsReady(true);
          setError(null);
          setRetryCount(0);
          setUsingProxy(useProxy);
          if (isPlaying) player.play().catch(e => console.warn('Play failed:', e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (data.details === 'manifestLoadError' && !useProxy && retryCount < MAX_RETRIES) {
                  console.log('Provo me CORS proxy...');
                  setUsingProxy(true);
                  setTimeout(() => startVideo(url, true), 1000);
                  return;
                }
                setTimeout(() => hlsRef.current?.startLoad(), Math.min(2000 * (retryCount + 1), 10000));
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError('Problem me stream-in');
                reportError({ type: 'hlsError', details: data.details || 'Gabim i panjohur HLS' });
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
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setRetryCount(0);
      setUsingProxy(useProxy);
    } else if (!isHls) {
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setRetryCount(0);
      setUsingProxy(useProxy);
    } else {
      setError('Shfletuesi juaj nuk mbështet HLS');
      reportError({ type: 'unsupported', details: 'HLS not supported' });
    }
  }, [isPlaying, retryCount, reportError, createProxyUrl]);

  // Initialize kur src ndryshon
  useEffect(() => {
    if (!src || !videoRef.current) return;
    setIsReady(false);
    setError(null);
    setIsBuffering(false);
    errorReportedRef.current = false;
    setRetryCount(0);
    setUsingProxy(false);
    startVideo(src, false);

    return () => hlsRef.current?.destroy();
  }, [src, startVideo]);

  // Play / Pause
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !isReady) return;
    isPlaying ? player.play().catch(() => onPlayPause?.()) : player.pause();
  }, [isPlaying, isReady, onPlayPause]);

  // Video events
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const onWaiting = () => {
      setIsBuffering(true);
      bufferTimerRef.current = setTimeout(() => setIsBuffering(false), 10000);
    };
    const onPlaying = () => setIsBuffering(false);
    const onError = () => {
      const videoError = player.error;
      if (videoError?.code) {
        setError('Gabim video: ' + videoError.code);
        reportError({ type: 'videoError', code: videoError.code });
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

  // Retry logic
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setError('Nuk mund të luhet stream-i.');
      return;
    }
    setRetryCount(prev => prev + 1);
    setError(null);
    errorReportedRef.current = false;
    setIsBuffering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
      setTimeout(() => src && startVideo(src, retryCount >= 1), 1000);
    }
  }, [retryCount, src, startVideo]);

  // Fullscreen
  const handleFullscreen = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen?.() || videoRef.current.webkitEnterFullscreen?.();
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

        {/* Loading */}
        {!isReady && !error && <div className="player-loading"><p>Duke ngarkuar...</p></div>}

        {/* Buffering */}
        {isBuffering && isReady && isPlaying && <div className="player-buffering"><p>Duke bufferuar... ({retryCount}/{MAX_RETRIES})</p></div>}

        {/* Error */}
        {error && (
          <div className="player-error">
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={handleRetry}>Provo përsëri</button>
              <button onClick={() => window.open(src, '_blank')}>Hap në browser</button>
            </div>
          </div>
        )}

        {/* Play overlay */}
        {!isPlaying && isReady && !error && <button className="play-btn-overlay" onClick={onPlayPause}>▶</button>}
        {isReady && !error && <button className="fullscreen-btn" onClick={handleFullscreen}>⛶</button>}
      </div>
    </div>
  );
};

export default HlsPlayer;
