// src/components/M3UUploader.jsx
import React, { useState, useCallback, useRef } from 'react';
import './M3UUploader.css';

const M3UUploader = ({ onLoad, onClose, isLoading, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState('file');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [usingProxy, setUsingProxy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [recentUrls, setRecentUrls] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentM3UUrls') || '[]');
    } catch {
      return [];
    }
  });
  
  const fileInputRef = useRef(null);
  const MAX_RETRIES = 3;

  // Lista e CORS proxy-ve
  const CORS_PROXIES = [
    { name: 'cors-anywhere', url: 'https://cors-anywhere.herokuapp.com/' },
    { name: 'allorigins', url: 'https://api.allorigins.win/raw?url=' },
    { name: 'corsproxy', url: 'https://corsproxy.io/?' },
    { name: 'thingproxy', url: 'https://thingproxy.freeboard.io/fetch/' },
    { name: 'cors-proxy', url: 'https://cors-proxy.htmldriven.com/?url=' }
  ];

  // Funksioni për Parse të M3U
  const parseM3U = useCallback((content, source = 'file') => {
    if (!content || !content.includes('#EXTM3U')) {
      return [];
    }
    
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;
    let lineCount = 0;
    
    for (let line of lines) {
      lineCount++;
      line = line.trim();
      if (!line) continue;
      
      if (line.startsWith('#EXTINF:')) {
        try {
          const extinfMatch = line.match(/#EXTINF:(-?\d+)(?:\s+(.*?))?,(.*)/);
          if (extinfMatch) {
            const tvgLogo = line.match(/tvg-logo="([^"]*)"/i)?.[1] || '';
            const tvgId = line.match(/tvg-id="([^"]*)"/i)?.[1] || '';
            const tvgName = line.match(/tvg-name="([^"]*)"/i)?.[1] || '';
            const groupTitle = line.match(/group-title="([^"]*)"/i)?.[1] || 'Të tjera';
            
            currentChannel = {
              id: `m3u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: extinfMatch[3]?.trim() || 'Pa emër',
              tvgId: tvgId || tvgName,
              logo: tvgLogo,
              group: groupTitle,
              url: '',
              stream_url: '',
              source: source,
              duration: extinfMatch[1] || '-1',
              raw: extinfMatch[0]
            };
          }
        } catch (err) {
          console.warn('Gabim në parse EXTINF:', err);
        }
      } else if (line.startsWith('#EXTGRP:')) {
        if (currentChannel) {
          const groupName = line.substring(8).trim();
          if (groupName && !currentChannel.group) {
            currentChannel.group = groupName;
          }
        }
      } else if (!line.startsWith('#') && currentChannel) {
        if (line.startsWith('http')) {
          currentChannel.url = line;
          currentChannel.stream_url = line;
          currentChannel.id = currentChannel.id || `m3u_${btoa(line).substr(0, 20)}`;
          channels.push({ ...currentChannel });
        }
        currentChannel = null;
      }
      
      if (lineCount > 100000) {
        console.warn('File shumë i madh, u ndërpre në 100000 rreshta');
        break;
      }
    }
    
    return channels;
  }, []);

  // Funksioni për validimin e URL-ve
  const isValidUrl = (urlString) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Ruaj URL-të e fundit
  const saveRecentUrl = (url) => {
    const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, 5);
    setRecentUrls(updated);
    localStorage.setItem('recentM3UUrls', JSON.stringify(updated));
  };

  // Konverto http në https
  const toHttps = (urlString) => {
    return urlString.replace(/^http:/i, 'https:');
  };

  // Apliko CORS proxy
  const applyProxy = (urlString, proxyIndex = 0) => {
    const proxy = CORS_PROXIES[proxyIndex];
    if (!proxy) return urlString;
    
    // Disa proxy kanë nevojë për encoding të ndryshëm
    if (proxy.name === 'allorigins') {
      return `${proxy.url}${encodeURIComponent(urlString)}`;
    } else if (proxy.name === 'corsproxy') {
      return `${proxy.url}${encodeURIComponent(urlString)}`;
    } else {
      return `${proxy.url}${urlString}`;
    }
  };

  // Detekto llojin e gabimit
  const getErrorMessage = (error, attemptedUrl) => {
    if (error.name === 'AbortError') {
      return 'Kërkesa u ndërpre (timeout). Serveri është shumë i ngadaltë.';
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      if (attemptedUrl.startsWith('http:')) {
        return 'Mixed Content: URL duhet të jetë HTTPS. Duke provuar zgjidhje alternative...';
      }
      return 'Problem me rrjetin ose CORS. Provo metodat e tjera.';
    }
    
    if (error.message.includes('CORS')) {
      return 'CORS error: Serveri nuk lejon qasje direkte.';
    }
    
    return error.message || 'Gabim i panjohur. Provo të shkarkosh file.';
  };

  // 1. Ngarkimi nga File
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['m3u', 'm3u8', 'txt'].includes(fileExt)) {
      setError('Formati i lejuar: .m3u, .m3u8, .txt');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB max
      setError('File shumë i madh. Maksimumi 100MB.');
      return;
    }

    setError('');
    setSuccess('');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const channels = parseM3U(content, 'file');
        
        if (channels.length > 0) {
          onLoad({ 
            type: 'file', 
            channels, 
            filename: file.name,
            count: channels.length
          });
          setSuccess(`✅ U ngarkuan ${channels.length} kanale nga "${file.name}".`);
          
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          setError('File nuk është format i vlefshëm M3U.');
        }
      } catch (err) {
        setError('Gabim gjatë leximit të file.');
        console.error(err);
      }
    };
    
    reader.onerror = () => {
      setError('Gabim gjatë leximit të file.');
    };
    
    reader.readAsText(file);
  }, [parseM3U, onLoad]);

  // 2. Ngarkimi nga URL me multiple fallback methods
  const handleUrlFetch = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Shkruani një URL');
      return;
    }
    
    if (!isValidUrl(url)) {
      setError('URL nuk është e vlefshme');
      return;
    }

    setIsFetching(true);
    setError('');
    setSuccess('');
    setDownloadProgress(0);
    setUsingProxy(false);
    setRetryCount(0);

    let content = null;
    let channels = [];
    let lastError = null;

    try {
      // Metoda 1: Provo HTTPS direkt (konverto http->https)
      if (url.startsWith('http:')) {
        const httpsUrl = toHttps(url);
        setDownloadProgress(10);
        
        try {
          console.log('Metoda 1: Duke provuar HTTPS:', httpsUrl);
          const response = await fetch(httpsUrl, {
            signal: AbortSignal.timeout(10000),
            headers: {
              'Accept': 'text/plain,application/x-mpegURL,application/vnd.apple.mpegurl',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            content = await response.text();
            channels = parseM3U(content, 'url');
            
            if (channels.length > 0) {
              console.log('✅ Sukses me HTTPS!');
            }
          }
        } catch (err) {
          console.log('❌ HTTPS dështoi:', err.message);
          lastError = err;
        }
      }

      // Metoda 2: Provo HTTP direkt (nëse nuk kemi sukses me HTTPS)
      if (channels.length === 0) {
        setDownloadProgress(30);
        
        try {
          console.log('Metoda 2: Duke provuar HTTP direkt:', url);
          const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
              'Accept': 'text/plain,application/x-mpegURL,application/vnd.apple.mpegurl',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          if (response.ok) {
            content = await response.text();
            channels = parseM3U(content, 'url');
            
            if (channels.length > 0) {
              console.log('✅ Sukses me HTTP direkt!');
            }
          }
        } catch (err) {
          console.log('❌ HTTP direkt dështoi:', err.message);
          lastError = err;
        }
      }

      // Metoda 3-7: Provo të gjithë CORS proxy-të
      let proxyIndex = 0;
      while (channels.length === 0 && proxyIndex < CORS_PROXIES.length) {
        setDownloadProgress(50 + (proxyIndex * 10));
        setUsingProxy(true);
        
        try {
          const proxyUrl = applyProxy(url, proxyIndex);
          console.log(`Metoda ${proxyIndex + 3}: Duke provuar ${CORS_PROXIES[proxyIndex].name}:`, proxyUrl);
          
          const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(15000),
            headers: {
              'Accept': 'text/plain,application/x-mpegURL,application/vnd.apple.mpegurl',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          
          if (response.ok) {
            let proxyContent = await response.text();
            
            // Disa proxy kthejnë JSON
            if (proxyContent.startsWith('{') && proxyContent.includes('contents')) {
              try {
                const jsonData = JSON.parse(proxyContent);
                proxyContent = jsonData.contents || jsonData.body || '';
              } catch (e) {
                // Ignore
              }
            }
            
            channels = parseM3U(proxyContent, 'url');
            
            if (channels.length > 0) {
              console.log(`✅ Sukses me proxy ${CORS_PROXIES[proxyIndex].name}!`);
              break;
            }
          }
        } catch (err) {
          console.log(`❌ Proxy ${CORS_PROXIES[proxyIndex].name} dështoi:`, err.message);
          lastError = err;
        }
        
        proxyIndex++;
      }

      // Nëse kemi kanale, sukses
      if (channels.length > 0) {
        saveRecentUrl(url);
        onLoad({ 
          type: 'url', 
          channels, 
          url,
          count: channels.length,
          usedProxy: usingProxy
        });
        
        setSuccess(`✅ Sukses! U ngarkuan ${channels.length} kanale.`);
        setUrl('');
      } else {
        // Asnjë metodë nuk funksionoi
        const errorMsg = getErrorMessage(lastError, url);
        setError(errorMsg);
        
        // Propozo shkarkim manual
        if (errorMsg.includes('CORS') || errorMsg.includes('Mixed Content')) {
          setError(errorMsg + ' Kliko butonin "Shkarko" më poshtë.');
        }
      }
      
    } catch (err) {
      console.error('Gabim i papritur:', err);
      setError('Gabim i papritur. Provo të shkarkosh file.');
    } finally {
      setIsFetching(false);
      setDownloadProgress(100);
      setTimeout(() => setDownloadProgress(0), 1000);
    }
  };

  // Funksioni për shkarkim manual
  const handleManualDownload = () => {
    if (!url) return;
    
    // Hap URL në tab të ri për shkarkim
    window.open(url, '_blank');
    
    // Shfaq udhëzime
    setSuccess(`
      📥 URL u hap në tab të ri. 
      Shkarko file dhe pastaj përdor opsionin "Nga File" për ta ngarkuar.
    `);
  };

  // Përzgjedh URL nga lista e fundit
  const handleSelectRecentUrl = (recentUrl) => {
    setUrl(recentUrl);
    setError('');
    setSuccess('');
  };

  // Reset form
  const handleReset = () => {
    setError('');
    setSuccess('');
    setUrl('');
    setDownloadProgress(0);
    setUsingProxy(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`m3u-modal-overlay theme-${theme}`} onClick={onClose}>
      <div className="m3u-modal" onClick={(e) => e.stopPropagation()}>
        <div className="m3u-modal-header">
          <h2>Ngarko M3U Playlist</h2>
          <button className="m3u-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="m3u-tabs">
          <button 
            className={`m3u-tab ${activeTab === 'file' ? 'active' : ''}`} 
            onClick={() => {
              setActiveTab('file');
              handleReset();
            }}
          >
            📁 Nga File
          </button>
          <button 
            className={`m3u-tab ${activeTab === 'url' ? 'active' : ''}`} 
            onClick={() => {
              setActiveTab('url');
              handleReset();
            }}
          >
            🔗 Nga URL
          </button>
        </div>

        <div className="m3u-modal-body">
          {activeTab === 'file' ? (
            <div className="m3u-file-section">
              <input 
                type="file" 
                id="m3u-file" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
                accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl"
                hidden 
              />
              <label htmlFor="m3u-file" className="m3u-file-upload-label">
                <span className="m3u-upload-icon">📁</span>
                <span className="m3u-upload-text">Zgjidh skedarin M3U</span>
                <span className="m3u-upload-hint">(max 100MB)</span>
              </label>
              <p className="m3u-file-info">
                Formate të mbështetura: .m3u, .m3u8, .txt
              </p>
            </div>
          ) : (
            <form onSubmit={handleUrlFetch} className="m3u-url-section">
              <div className="m3u-url-input-group">
                <input 
                  type="url" 
                  placeholder="https://example.com/playlist.m3u8"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isFetching}
                  className={`m3u-url-input ${usingProxy ? 'using-proxy' : ''}`}
                />
                
                {usingProxy && (
                  <div className="m3u-proxy-indicator">
                    <span className="m3u-proxy-icon">🔄</span>
                    Duke përdorur CORS proxy...
                  </div>
                )}
                
                {downloadProgress > 0 && downloadProgress < 100 && (
                  <div className="m3u-progress-bar">
                    <div 
                      className="m3u-progress-fill" 
                      style={{width: `${downloadProgress}%`}}
                    ></div>
                    <span>{downloadProgress}%</span>
                  </div>
                )}
              </div>
              
              <div className="m3u-url-actions">
                <button 
                  type="submit" 
                  className="m3u-fetch-btn" 
                  disabled={isFetching || isLoading || !url}
                >
                  {isFetching ? (
                    <>
                      <span className="m3u-spinner"></span>
                      Duke provuar metoda...
                    </>
                  ) : 'Ngarko Direkt'}
                </button>
                
                <button 
                  type="button" 
                  className="m3u-download-alt-btn"
                  onClick={handleManualDownload}
                  disabled={!url || isFetching}
                >
                  ⬇️ Shkarko Manualisht
                </button>
              </div>
              
              {/* URL-të e fundit */}
              {recentUrls.length > 0 && (
                <div className="m3u-recent-urls">
                  <p className="m3u-recent-title">URL të fundit:</p>
                  <div className="m3u-recent-list">
                    {recentUrls.map((recentUrl, index) => (
                      <button
                        key={index}
                        type="button"
                        className="m3u-recent-url-btn"
                        onClick={() => handleSelectRecentUrl(recentUrl)}
                        title={recentUrl}
                      >
                        🔗 {recentUrl.substring(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Udhëzime për Mixed Content */}
              <div className="m3u-url-note">
                <p><strong>ℹ️ Probleme me Mixed Content?</strong></p>
                <p>Nëse URL fillon me <code>http://</code> dhe nuk funksionon:</p>
                <ul>
                  <li>Provo të ndryshosh manualisht në <code>https://</code></li>
                  <li>Përdor butonin <strong>"Shkarko Manualisht"</strong></li>
                  <li>Shkarko file dhe përdor opsionin "Nga File"</li>
                </ul>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="m3u-error-msg">
              <span className="m3u-error-icon">⚠️</span>
              <div className="m3u-error-content">
                <p><strong>{error}</strong></p>
                
                {error.includes('Mixed Content') && (
                  <div className="m3u-error-solution">
                    <p>Zgjidhje të shpejta:</p>
                    <div className="m3u-solution-buttons">
                      <button 
                        className="m3u-solution-btn"
                        onClick={() => {
                          const httpsUrl = toHttps(url);
                          setUrl(httpsUrl);
                          handleUrlFetch(new Event('submit'));
                        }}
                      >
                        🔄 Provo me HTTPS
                      </button>
                      <button 
                        className="m3u-solution-btn"
                        onClick={handleManualDownload}
                      >
                        📥 Shkarko
                      </button>
                    </div>
                  </div>
                )}
                
                {error.includes('CORS') && (
                  <div className="m3u-error-solution">
                    <p>Duke përdorur CORS proxy automatikisht...</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="m3u-success-msg">
              <span className="m3u-success-icon">✅</span>
              <div>
                <p><strong>{success}</strong></p>
                {usingProxy && (
                  <p className="m3u-success-note">
                    <small>⚠️ U përdor CORS proxy. Performanca mund të jetë më e ngadaltë.</small>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {(isLoading || isFetching) && (
          <div className="m3u-modal-loading">
            <div className="m3u-spinner-large"></div>
            <p>
              {isFetching ? 'Duke provuar metoda të ndryshme...' : 'Duke procesuar playlist...'}
            </p>
            {usingProxy && (
              <p className="m3u-loading-note">Përdor CORS proxy, mund të zgjasë pak...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default M3UUploader;
