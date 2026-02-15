// src/components/ModernHlsPlayer.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import './HlsPlayer.css';

const MAX_RETRIES = 3;

const ModernHlsPlayer = ({ src, isPlaying, onPlayPause, theme, poster }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [usingProxy, setUsingProxy] = useState(false);
  const bufferTimerRef = useRef(null);

  // CORS Proxy (auto fallback)
  const createProxyUrl = useCallback((url) => {
    const proxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url='
    ];
    return proxies[0] + encodeURIComponent(url);
  }, []);

  const startVideo = useCallback((url, useProxy = false) => {
    const player = videoRef.current;
    if (!player) return;

    // Clean previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let finalUrl = useProxy ? createProxyUrl(url) : url;

    // Warn for Mixed Content
    if (window.location.protocol === 'https:' && finalUrl.startsWith('http:') && !useProxy) {
      console.warn('⚠️ Mixed Content: HTTPS page cannot load HTTP stream');
    }

    const isHls = finalUrl.endsWith('.m3u8') || finalUrl.includes('playlist.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(finalUrl));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        setError(null);
        setRetryCount(0);
        setUsingProxy(useProxy);
        if (isPlaying) player.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy && retryCount < MAX_RETRIES) {
                console.log('Retrying with proxy...');
                setRetryCount(prev => prev + 1);
                startVideo(url, true);
              } else {
                setError('Network error, nuk mund të luhet stream-i.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Gabim fatal në HLS');
              break;
          }
        }
      });

      hls.attachMedia(player);
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setUsingProxy(useProxy);
    } else {
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
      setUsingProxy(useProxy);
    }
  }, [createProxyUrl, isPlaying, retryCount]);

  // Start video on src change
  useEffect(() => {
    if (!src) return;
    setIsReady(false);
    setError(null);
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

  // Play / Pause
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !isReady) return;
    if (isPlaying) player.play().catch(() => {});
    else player.pause();
  }, [isPlaying, isReady]);

  // Video buffering & retry
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const onWaiting = () => {
      setIsBuffering(true);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = setTimeout(() => {
        setIsBuffering(false);
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          startVideo(src, true);
        }
      }, 10000);
    };

    const onPlaying = () => {
      setIsBuffering(false);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };

    player.addEventListener('waiting', onWaiting);
    player.addEventListener('playing', onPlaying);

    return () => {
      player.removeEventListener('waiting', onWaiting);
      player.removeEventListener('playing', onPlaying);
    };
  }, [src, retryCount, startVideo]);

  const handleFullscreen = () => {
    if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
    else if (videoRef.current.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
  };

  if (!src) return null;

  return (
    <div className={`modern-hls-player theme-${theme}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          playsInline
          preload="auto"
          poster={poster}
          crossOrigin="anonymous"
        />

        {!isReady && !error && <div className="loading">Duke ngarkuar stream...</div>}
        {isBuffering && <div className="buffering">Buffering... ({retryCount}/{MAX_RETRIES})</div>}
        {error && <div className="error">{error}</div>}

        <button className="fullscreen-btn" onClick={handleFullscreen}>⛶</button>
        {!isPlaying && isReady && !error && (
          <button className="play-btn-overlay" onClick={onPlayPause}>▶</button>
        )}
      </div>
    </div>
  );
};

export default HlsPlayer;
