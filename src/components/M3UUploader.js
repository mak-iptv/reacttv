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
  const [recentUrls, setRecentUrls] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentM3UUrls') || '[]');
    } catch {
      return [];
    }
  });
  
  const fileInputRef = useRef(null);

  // Funksioni për Parse të M3U (i optimizuar)
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
          // Parse EXTINF me regex më të saktë
          const extinfMatch = line.match(/#EXTINF:(-?\d+)(?:\s+(.*?))?,(.*)/);
          if (extinfMatch) {
            // Ekstrakto atributet
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
        // Grupi alternativ
        if (currentChannel) {
          const groupName = line.substring(8).trim();
          if (groupName && !currentChannel.group) {
            currentChannel.group = groupName;
          }
        }
      } else if (!line.startsWith('#') && currentChannel) {
        // URL e kanalit
        if (line.startsWith('http')) {
          currentChannel.url = line;
          currentChannel.stream_url = line;
          
          // Krijim i ID-së unike bazuar në URL
          currentChannel.id = currentChannel.id || `m3u_${btoa(line).substr(0, 20)}`;
          
          channels.push({ ...currentChannel });
        }
        currentChannel = null;
      }
      
      // Siguri kundër file-ve shumë të mëdhenj
      if (lineCount > 100000) {
        console.warn('File shumë i madh, u ndërpre në 100000 rreshta');
        break;
      }
    }
    
    return channels;
  }, []);

  // Funksioni për validimin e URL-ve M3U
  const isValidM3UUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Ruaj URL-të e fundit në localStorage
  const saveRecentUrl = (url) => {
    const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, 5);
    setRecentUrls(updated);
    localStorage.setItem('recentM3UUrls', JSON.stringify(updated));
  };

  // 1. Ngarkimi nga File
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validim i tipit të file
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['m3u', 'm3u8', 'txt'].includes(fileExt)) {
      setError('Formati i lejuar: .m3u, .m3u8, .txt');
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
          
          // Reset file input
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

  // 2. Ngarkimi DIREKT nga URL me progress
  const handleUrlFetch = async (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('Shkruani një URL');
      return;
    }
    
    if (!isValidM3UUrl(url)) {
      setError('URL nuk është e vlefshme');
      return;
    }

    setIsFetching(true);
    setError('');
    setSuccess('');
    setDownloadProgress(0);

    try {
      // Përdorim AbortController për timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sekonda timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain,application/x-mpegURL,application/vnd.apple.mpegurl',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Serveri u përgjigj me status: ${response.status}`);
      }
      
      // Get content length për progress
      const contentLength = response.headers.get('content-length');
      const reader = response.body.getReader();
      let receivedLength = 0;
      let chunks = [];
      
      while(true) {
        const {done, value} = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength) {
          setDownloadProgress(Math.round((receivedLength / parseInt(contentLength)) * 100));
        }
      }
      
      // Kombino chunks
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for(let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      
      // Decode si tekst
      const content = new TextDecoder("utf-8").decode(chunksAll);
      
      // Parse channels
      const channels = parseM3U(content, 'url');
      
      if (channels.length > 0) {
        // Ruaj URL-në e suksesshme
        saveRecentUrl(url);
        
        onLoad({ 
          type: 'url', 
          channels, 
          url,
          count: channels.length
        });
        
        setSuccess(`✅ Sukses! U ngarkuan ${channels.length} kanale nga URL.`);
        setUrl(''); // Pastro URL pas suksesit
      } else {
        setError('URL nuk përmban një playlist të vlefshme M3U.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      
      if (err.name === 'AbortError') {
        setError('Kërkesa u ndërpre (timeout). URL mund të jetë shumë e ngadaltë.');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('CORS Error: Ky server nuk lejon lexim direkt. Përdor metodën "Shkarko dhe Ngarko".');
      } else {
        setError(`Gabim: ${err.message}`);
      }
    } finally {
      setIsFetching(false);
      setDownloadProgress(0);
    }
  };

  // Përzgjedh URL nga lista e fundit
  const handleSelectRecentUrl = (recentUrl) => {
    setUrl(recentUrl);
  };

  // Reset form
  const handleReset = () => {
    setError('');
    setSuccess('');
    setUrl('');
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
                  className="m3u-url-input"
                />
                
                {downloadProgress > 0 && (
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
                      Duke u lidhur...
                    </>
                  ) : 'Ngarko Direkt'}
                </button>
                
                <button 
                  type="button" 
                  className="m3u-download-alt-btn"
                  onClick={() => window.open(url, '_blank')}
                  disabled={!url || isFetching}
                >
                  ⬇️ Shkarko
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
                      >
                        🔗 {recentUrl.substring(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="m3u-url-note">
                <p>💡 Nëse URL nuk funksionon direkt, shkarko file dhe ngarko manualisht.</p>
              </div>
            </form>
          )}

          {error && (
            <div className="m3u-error-msg">
              <span className="m3u-error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {success && (
            <div className="m3u-success-msg">
              <span className="m3u-success-icon">✅</span>
              {success}
            </div>
          )}
        </div>

        {(isLoading || isFetching) && (
          <div className="m3u-modal-loading">
            <div className="m3u-spinner-large"></div>
            <p>Duke procesuar playlist...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default M3UUploader;
