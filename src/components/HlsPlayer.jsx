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
  useEffect(() => () => clearTimeout(bufferTimerRef.current), []);

  // Report error once
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      const err = {
        type: errorData?.type || 'unknown',
        message: errorData?.message || errorData?.details || 'Gabim i panjohur',
        code: errorData?.code,
        details: errorData?.details || errorData?.message
      };
      onError(err);
      setTimeout(() => errorReportedRef.current = false, 2000);
    }
  }, [onError]);

  // Proxy server-side
  const createProxyUrl = useCallback((url) => {
    // URL duhet të shkojë përmes serverit tonë (ex: /api/stream?url=...)
    return `/api/stream?url=${encodeURIComponent(url)}`;
  }, []);

  const startVideo = useCallback((url, useProxy = false) => {
    const player = videoRef.current;
    if (!player) return;

    // Destroy existing HLS
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch (e) {}
      hlsRef.current = null;
    }

    // URL final me proxy
    let finalUrl = useProxy ? createProxyUrl(url) : url;

    // Warning për Mixed Content
    if (window.location.protocol === 'https:' && finalUrl.startsWith('http:') && !useProxy) {
      console.warn('⚠️ Mixed Content: HTTPS page loading HTTP resource');
    }

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
            // User-Agent nuk vendoset - browser bllokon
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
          if (isPlaying) player.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (data.details === 'manifestLoadError' && !useProxy && retryCount < MAX_RETRIES) {
                  console.log('⚡ Retry with proxy...');
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
                reportError({ type: 'hlsError', details: data.details || data.error?.message });
                setError('Problem me stream-in');
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
      // Safari HLS native
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setRetryCount(0);
      setUsingProxy(useProxy);
    } else if (!isHls) {
      // Direct file
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
  }, [isPlaying, reportError, retryCount, createProxyUrl]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    setIsReady(false); setError(null); setIsBuffering(false);
    errorReportedRef.current = false; setRetryCount(0); setUsingProxy(false);
    startVideo(src, false);
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [src, startVideo]);

  // Play/Pause
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !isReady) return;
    if (isPlaying) player.play().catch(() => {});
    else player.pause();
  }, [isPlaying, isReady]);

  // Buffering & video events
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const onWaiting = () => {
      setIsBuffering(true);
      bufferTimerRef.current = setTimeout(() => setIsBuffering(false), 10000);
    };
    const onPlaying = () => { setIsBuffering(false); clearTimeout(bufferTimerRef.current); };
    const onError = () => {
      const err = player.error;
      if (err) reportError({ type: 'videoError', code: err.code, details: `Video error code ${err.code}` });
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
    if (retryCount >= MAX_RETRIES) { setError('Nuk mund të luhet stream-i. Provo një tjetër.'); return; }
    setRetryCount(prev => prev + 1);
    setError(null); errorReportedRef.current = false;
    videoRef.current?.pause(); videoRef.current?.removeAttribute('src'); videoRef.current?.load();
    const useProxy = retryCount >= 1;
    setTimeout(() => src && startVideo(src, useProxy), 1000);
  }, [retryCount, src, startVideo]);

  const handleFullscreen = useCallback(() => {
    const player = videoRef.current;
    if (!player) return;
    if (player.requestFullscreen) player.requestFullscreen();
    else if (player.webkitEnterFullscreen) player.webkitEnterFullscreen();
  }, []);

  if (!src) return null;

  return (
    <div className={`hls-player theme-${theme}`}>
      <div className="video-container">
        <video ref={videoRef} className="video-element" playsInline controls={false} preload="auto"
               poster={currentStreamInfo?.logo} crossOrigin="anonymous" />

        {!isReady && !error && (
          <div className="player-loading">
            <div className="loading-spinner"></div>
            <p>Duke ngarkuar stream-in...</p>
            {usingProxy && <p className="proxy-note">Duke përdorur proxy...</p>}
          </div>
        )}

        {isBuffering && isReady && isPlaying && (
          <div className="player-buffering">
            <div className="buffering-spinner"></div>
            <p>Duke bufferuar... ({retryCount}/{MAX_RETRIES})</p>
          </div>
        )}

        {error && (
          <div className="player-error">
            <span>⚠️</span>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={handleRetry}>Provo përsëri</button>
              <button onClick={() => window.open(src, '_blank')}>Hap në browser</button>
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
    </div>
  );
};

export default HlsPlayer;
