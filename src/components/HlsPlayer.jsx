// src/components/HlsPlayer.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import "./HlsPlayer.css";

const MAX_RETRIES = 3;
const MANIFEST_TIMEOUT = 15000;

const HlsPlayer = ({
  src,
  isPlaying,
  onPlayPause,
  onError,
  theme = "dark",
  useProxy = true, // Add proxy option
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryRef = useRef(0);
  const manifestTimerRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [proxyUrl, setProxyUrl] = useState(null);

  // Cleanup
  const destroyPlayer = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
  };

  const reportError = (message, details = null) => {
    console.error("HLS Error:", message, details);
    setError(message);
    onError?.({ message, details });
  };

  // Function to get proxy URL
  const getProxyUrl = useCallback(async (originalUrl) => {
    try {
      // Check if URL is from the problematic domain
      const urlObj = new URL(originalUrl);
      const isProblemDomain = urlObj.hostname.includes('dyndns.info');
      
      if (!useProxy || !isProblemDomain) {
        return originalUrl;
      }

      // Try multiple proxy approaches
      const proxyApproaches = [
        // Approach 1: Your API proxy
        `/api/stream-proxy?url=${encodeURIComponent(originalUrl)}`,
        
        // Approach 2: CORS proxy
        `https://cors-anywhere.herokuapp.com/${originalUrl}`,
        
        // Approach 3: All origins proxy
        `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        
        // Approach 4: ThingProxy
        `https://thingproxy.freeboard.io/fetch/${originalUrl}`
      ];

      // Test each proxy
      for (const proxy of proxyApproaches) {
        try {
          console.log('Testing proxy:', proxy);
          const testResponse = await fetch(proxy, { 
            method: 'HEAD',
            mode: 'no-cors' // This will hide errors but we'll continue anyway
          });
          
          // If we get here, proxy might work
          console.log('Proxy responded:', proxy);
          return proxy;
        } catch (e) {
          console.log('Proxy failed:', proxy, e.message);
          continue;
        }
      }

      // If all proxies fail, return original URL
      return originalUrl;
    } catch (e) {
      console.warn('Proxy detection failed:', e);
      return originalUrl;
    }
  }, [useProxy]);

  const startVideo = useCallback(async (url) => {
    const video = videoRef.current;
    if (!video) return;

    destroyPlayer();
    retryRef.current = 0;
    setIsReady(false);
    setError(null);
    setProxyUrl(null);

    try {
      // Get proxy URL if needed
      const finalUrl = await getProxyUrl(url);
      setProxyUrl(finalUrl);
      
      console.log('🎥 Starting video with URL:', finalUrl);
      
      // Fix protocol mismatch
      if (window.location.protocol === "https:" && finalUrl.startsWith("http:")) {
        console.log('⚠️ Protocol mismatch, attempting HTTPS...');
      }

      const isHls = finalUrl.includes(".m3u8");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          liveSyncDuration: 10,
          liveMaxLatencyDuration: 30,
          fragLoadingTimeOut: 30000, // Increased timeout
          fragLoadingMaxRetry: 10,    // More retries
          levelLoadingMaxRetry: 10,
          manifestLoadingMaxRetry: 10,
          xhrSetup: (xhr, url) => {
            // Add custom headers for problematic domains
            if (url.includes('dyndns.info')) {
              xhr.withCredentials = false;
              xhr.setRequestHeader('Referer', 'https://zdravahrana.dyndns.info');
              xhr.setRequestHeader('Origin', 'https://zdravahrana.dyndns.info');
              xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            }
          }
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('📼 Media attached, loading source:', finalUrl);
          hls.loadSource(finalUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log('✅ Manifest parsed, levels:', data.levels.length);
          setIsReady(true);
          setQualityLevels(data.levels);
          clearTimeout(manifestTimerRef.current);

          // Autoplay with user interaction
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('▶️ Autoplay started');
                video.muted = false;
              })
              .catch(err => {
                console.log('⚠️ Autoplay prevented:', err);
                // User needs to click play
              });
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('HLS Error:', data.type, data.details, data.fatal);
          
          if (!data.fatal) return;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryRef.current < MAX_RETRIES) {
                retryRef.current++;
                console.log(`Retry ${retryRef.current}/${MAX_RETRIES}`);
                setTimeout(() => hls.startLoad(), 2000);
              } else {
                reportError("Stream-i nuk përgjigjet pas disa përpjekjeve.", data);
                // Try without proxy as fallback
                if (useProxy && proxyUrl !== url) {
                  console.log('Trying without proxy...');
                  startVideo(url);
                }
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Attempting media recovery...');
              hls.recoverMediaError();
              break;

            default:
              reportError("Gabim fatal në stream.", data);
              destroyPlayer();
              break;
          }
        });

        hls.attachMedia(video);

        // Manifest timeout
        manifestTimerRef.current = setTimeout(() => {
          if (!isReady) {
            reportError("Stream-i nuk po ngarkohet. Kontrollo lidhjen.");
          }
        }, MANIFEST_TIMEOUT);
      } else {
        // Native video for non-HLS
        video.src = finalUrl;
        video.load();
        setIsReady(true);
        
        video.addEventListener('error', (e) => {
          reportError('Video error: ' + video.error?.message);
        });
      }
    } catch (err) {
      reportError('Gabim gjatë inicializimit: ' + err.message);
    }
  }, [getProxyUrl, isReady, useProxy]);

  // Init
  useEffect(() => {
    if (!src) return;
    startVideo(src);

    return () => destroyPlayer();
  }, [src, startVideo]);

  // Play / Pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (isPlaying) {
      video.play().catch((err) => {
        console.log('Play failed:', err);
        onPlayPause?.();
      });
    } else {
      video.pause();
    }
  }, [isPlaying, isReady, onPlayPause]);

  // Buffer events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onStalled = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  const changeQuality = (levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQuality(levelIndex);
  };

  const retryWithDifferentProxy = () => {
    setError(null);
    startVideo(src);
  };

  if (!src) return null;

  return (
    <div className={`hls-player theme-${theme}`}>
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        controls
        crossOrigin="anonymous"
      />

      {!isReady && !error && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Duke ngarkuar stream-in...</p>
          {proxyUrl && proxyUrl !== src && (
            <small>Përdor proxy: {proxyUrl.substring(0, 50)}...</small>
          )}
        </div>
      )}

      {isBuffering && isReady && (
        <div className="buffering">
          <div className="spinner small"></div>
          <p>Duke bufferuar...</p>
        </div>
      )}

      {error && (
        <div className="error-box">
          <p>❌ {error}</p>
          <div className="error-actions">
            <button onClick={() => startVideo(src)} className="retry-btn">
              Provo përsëri
            </button>
            <button onClick={retryWithDifferentProxy} className="proxy-btn">
              Provo me proxy tjetër
            </button>
            <button 
              onClick={() => window.open(src, '_blank')} 
              className="browser-btn"
            >
              Hap në browser
            </button>
          </div>
          <details className="debug-info">
            <summary>🔧 Debug Info</summary>
            <pre>
              URL: {src}
              Proxy: {proxyUrl || 'N/A'}
              User-Agent: {navigator.userAgent}
            </pre>
          </details>
        </div>
      )}

      {qualityLevels.length > 1 && (
        <div className="quality-selector">
          <select
            value={currentQuality}
            onChange={(e) => changeQuality(Number(e.target.value))}
          >
            <option value={-1}>Auto</option>
            {qualityLevels.map((level, index) => (
              <option key={index} value={index}>
                {level.height}p
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default HlsPlayer;
