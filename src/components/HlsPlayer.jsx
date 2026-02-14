import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
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
  const bufferTimerRef = useRef(null);
  const errorReportedRef = useRef(false);
  const MAX_RETRIES = 3;

  // Raportimi i gabimeve
  const reportError = useCallback((errorData) => {
    if (!errorReportedRef.current && onError) {
      errorReportedRef.current = true;
      onError({
        type: errorData?.type || 'unknown',
        message: errorData?.message || 'Gabim gjatë transmetimit',
        details: errorData?.details
      });
      setTimeout(() => { errorReportedRef.current = false; }, 3000);
    }
  }, [onError]);

  // Funksioni kryesor i nisjes së videos
  const startVideo = useCallback((url) => {
    const player = videoRef.current;
    if (!player || !url) return;

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
        xhrSetup: (xhr) => {
          // Disa providera IPTV kërkojnë headers specifikë
          if (url.includes('panther-tv') || url.includes('balkan-x')) {
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          }
        }
      });

      hls.loadSource(finalUrl);
      hls.attachMedia(player);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        setError(null);
        if (isPlaying) player.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Stream-i nuk mund të ngarkohet');
              reportError(data);
              hls.destroy();
              break;
          }
        }
      });
    } 
    // Mbështetja për Safari (iOS/Mac)
    else if (player.canPlayType('application/vnd.apple.mpegurl')) {
      player.src = finalUrl;
      player.addEventListener('loadedmetadata', () => {
        setIsReady(true);
        if (isPlaying) player.play().catch(() => {});
      });
    }
    // Formate të tjera (mp4, etj)
    else {
      player.src = finalUrl;
      setIsReady(true);
    }
  }, [isPlaying, reportError]);

  // Efekti kur ndryshon burimi (src)
  useEffect(() => {
    setIsReady(false);
    setError(null);
    setRetryCount(0);
    
    if (src) {
      startVideo(src);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, startVideo]);

  // Kontrolli Play/Pause
  useEffect(() => {
    if (!videoRef.current || !isReady) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => onPlayPause?.());
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isReady, onPlayPause]);

  // Eventet e buffering
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    player.addEventListener('waiting', handleWaiting);
    player.addEventListener('playing', handlePlaying);

    return () => {
      player.removeEventListener('waiting', handleWaiting);
      player.removeEventListener('playing', handlePlaying);
    };
  }, []);

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      startVideo(src);
    } else {
      setError("Pati një problem të përsëritur. Provo kanal tjetër.");
    }
  };

  if (!src) return null;

  return (
    <div className={`hls-player theme-${theme}`}>
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          playsInline
          controls={true}
          poster={currentStreamInfo?.logo}
          crossOrigin="anonymous"
        />

        {/* Shfaqja e Loading */}
        {!isReady && !error && (
          <div className="player-overlay loading">
            <div className="spinner"></div>
            <p>Duke u lidhur...</p>
          </div>
        )}

        {/* Shfaqja e Gabimit */}
        {error && (
          <div className="player-overlay error">
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-btn">Provo përsëri</button>
          </div>
        )}

        {/* Buffering */}
        {isBuffering && isReady && (
          <div className="buffering-icon">🌀</div>
        )}
      </div>

      {/* Info Paneli poshtë videos */}
      {currentStreamInfo && (
        <div className="player-footer">
          <div className="channel-meta">
            {currentStreamInfo.logo && <img src={currentStreamInfo.logo} alt="" />}
            <div>
              <h3>{currentStreamInfo.name}</h3>
              <p>{currentEpg?.title || 'Nuk ka informacion EPG'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
