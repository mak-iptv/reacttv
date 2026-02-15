// src/components/HlsPlayer.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import './HlsPlayer.css';

const HlsPlayer = ({ src, isPlaying, onPlayPause, onError, theme, currentStreamInfo, currentEpg }) => {
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

  // Funksion për raportimin e error
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      onError({
        type: errorData?.type || 'unknown',
        message: errorData?.message || errorData?.details || 'Gabim i panjohur',
        code: errorData?.code,
        details: errorData?.details || errorData?.message
      });
      setTimeout(() => errorReportedRef.current = false, 2000);
    }
  }, [onError]);

  // Funksion për proxy CORS
  const createProxyUrl = useCallback((url) => {
    // API All Origins: transformon çdo HTTP në HTTPS
    return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
  }, []);

  const startVideo = useCallback((url, useProxy = false) => {
    const player = videoRef.current;
    if (!player) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let finalUrl = useProxy ? createProxyUrl(url) : url;

    // Kontrollo Mixed Content
    const isHttpsPage = window.location.protocol === 'https:';
    const isHttpUrl = finalUrl.startsWith('http:');
    if (isHttpsPage && isHttpUrl && !useProxy) {
      console.warn('⚠️ Mixed Content: HTTP stream on HTTPS page, switching to proxy');
      finalUrl = createProxyUrl(url);
      setUsingProxy(true);
    } else {
      setUsingProxy(useProxy);
    }

    console.log('🎬 Start video:', finalUrl);

    const isHls = finalUrl.includes('.m3u8');
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        debug: false,
        xhrSetup: (xhr, url) => {
          xhr.setRequestHeader('Accept', '*/*');
          xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
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
        if (isPlaying) player.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => startVideo(url, true), 1000);
          } else {
            setError('Problem me stream-in');
            reportError({ type: 'hlsError', details: data.details });
          }
        }
      });

      hls.attachMedia(player);

    } else if (isHls && player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
    } else if (!isHls) {
      player.src = finalUrl;
      player.load();
      setIsReady(true);
      setError(null);
    } else {
      setError('Shfletuesi nuk mbështet HLS');
      reportError({ type: 'unsupported', details: 'HLS not supported' });
    }
  }, [isPlaying, reportError, retryCount, createProxyUrl]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    setIsReady(false);
    setError(null);
    setRetryCount(0);
    setUsingProxy(false);
    startVideo(src, false);

    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [src, startVideo]);

  return (
    <div className={`hls-player theme-${theme}`}>
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        controls={false}
        preload="auto"
        poster={currentStreamInfo?.logo}
        crossOrigin="anonymous"
      />
      {!isReady && !error && <p>Duke ngarkuar stream-in...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}
      {usingProxy && <p style={{color:'orange'}}>Duke përdorur proxy për HTTPS</p>}
    </div>
  );
};

export default HlsPlayer;
