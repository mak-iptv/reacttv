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

  // Cleanup
  const destroyPlayer = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
  };

  const reportError = (message) => {
    setError(message);
    onError?.({ message });
  };

  const startVideo = useCallback(
    (url) => {
      const video = videoRef.current;
      if (!video) return;

      destroyPlayer();
      retryRef.current = 0;
      setIsReady(false);
      setError(null);

      if (window.location.protocol === "https:" && url.startsWith("http:")) {
        url = url.replace("http://", "https://");
      }

      const isHls = url.includes(".m3u8");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          liveSyncDuration: 10,
          liveMaxLatencyDuration: 30,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(url);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setIsReady(true);
          setQualityLevels(data.levels);
          clearTimeout(manifestTimerRef.current);

          // Autoplay fix
          video.muted = true;
          video
            .play()
            .then(() => {
              video.muted = false;
            })
            .catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryRef.current < MAX_RETRIES) {
                retryRef.current++;
                setTimeout(() => hls.startLoad(), 2000);
              } else {
                reportError("Stream-i nuk përgjigjet.");
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;

            default:
              reportError("Gabim fatal në stream.");
              destroyPlayer();
              break;
          }
        });

        hls.attachMedia(video);

        // Manifest timeout
        manifestTimerRef.current = setTimeout(() => {
          if (!isReady) {
            reportError("Stream-i nuk po ngarkohet.");
          }
        }, MANIFEST_TIMEOUT);
      } else {
        video.src = url;
        video.load();
        setIsReady(true);
      }
    },
    [isReady]
  );

  // Init
  useEffect(() => {
    if (!src) return;
    startVideo(src);

    return () => destroyPlayer();
  }, [src]);

  // Play / Pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (isPlaying) {
      video.play().catch(() => onPlayPause?.());
    } else {
      video.pause();
    }
  }, [isPlaying, isReady]);

  // Buffer events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  const changeQuality = (levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQuality(levelIndex);
  };

  if (!src) return null;

  return (
    <div className={`hls-player theme-${theme}`}>
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        controls
      />

      {!isReady && !error && (
        <div className="loading">Duke ngarkuar stream-in...</div>
      )}

      {isBuffering && isReady && (
        <div className="buffering">Duke bufferuar...</div>
      )}

      {error && (
        <div className="error-box">
          <p>{error}</p>
          <button onClick={() => startVideo(src)}>
            Provo përsëri
          </button>
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
