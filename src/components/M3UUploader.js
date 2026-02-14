// src/components/M3UUploader.jsx
import React, { useState } from 'react';
import './M3UUploader.css';

const M3UUploader = ({ onLoad, onClose, isLoading, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState('file');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Funksioni për Parse të M3U (i mbajtur si i joti, me disa optimizime)
  const parseM3U = (content) => {
    if (!content || !content.includes('#EXTM3U')) return [];
    
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;
    
    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.*?))?,(.*)/);
        if (match) {
          currentChannel = {
            id: `m3u_${Math.random().toString(36).substr(2, 9)}`,
            name: match[3]?.trim() || 'Pa emër',
            logo: line.match(/tvg-logo="([^"]*)"/i)?.[1] || '',
            group: line.match(/group-title="([^"]*)"/i)?.[1] || 'Të tjera',
            url: '',
            source: 'm3u'
          };
        }
      } else if (!line.startsWith('#') && currentChannel) {
        if (line.startsWith('http')) {
          currentChannel.url = line;
          currentChannel.stream_url = line;
          channels.push({ ...currentChannel });
        }
        currentChannel = null;
      }
    });
    return channels;
  };

  // 1. Ngarkimi nga File
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const channels = parseM3U(e.target.result);
      if (channels.length > 0) {
        onLoad({ type: 'file', channels, filename: file.name });
        setSuccess(`✅ U ngarkuan ${channels.length} kanale.`);
      } else {
        setError('File nuk është format i vlefshëm M3U.');
      }
    };
    reader.readAsText(file);
  };

  // 2. Ngarkimi DIREKT nga URL (E RE)
  const handleUrlFetch = async (e) => {
    e.preventDefault();
    if (!url) return setError('Shkruani një URL');

    setIsFetching(true);
    setError('');
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Serveri nuk u përgjigj');
      
      const content = await response.text();
      const channels = parseM3U(content);

      if (channels.length > 0) {
        onLoad({ type: 'url', channels, url });
        setSuccess(`✅ Sukses! U ngarkuan ${channels.length} kanale direkt nga linku.`);
      } else {
        setError('URL nuk përmban një playlist të vlefshme.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('CORS Error: Ky server nuk lejon lexim direkt. Kliko butonin "Shkarko dhe Ngarko" më poshtë.');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className={`xtream-modal-overlay theme-${theme}`} onClick={onClose}>
      <div className="xtream-modal" onClick={(e) => e.stopPropagation()}>
        <div className="xtream-modal-header">
          <h2>Ngarko M3U Playlist</h2>
          <button className="xtream-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="m3u-tabs">
          <button className={activeTab === 'file' ? 'active' : ''} onClick={() => setActiveTab('file')}>📁 Nga File</button>
          <button className={activeTab === 'url' ? 'active' : ''} onClick={() => setActiveTab('url')}>🔗 Nga URL</button>
        </div>

        <div className="xtream-modal-body">
          {activeTab === 'file' ? (
            <div className="file-section">
              <input type="file" id="m3u-file" onChange={handleFileUpload} hidden />
              <label htmlFor="m3u-file" className="file-upload-label">
                <span>📁 Zgjidh skedarin M3U</span>
              </label>
            </div>
          ) : (
            <form onSubmit={handleUrlFetch} className="url-section">
              <input 
                type="url" 
                placeholder="https://example.com/playlist.m3u"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="url-actions">
                <button type="submit" className="fetch-btn" disabled={isFetching || isLoading}>
                  {isFetching ? 'Duke u lidhur...' : 'Ngarko Direkt'}
                </button>
                <button 
                  type="button" 
                  className="download-alt-btn"
                  onClick={() => window.open(url, '_blank')}
                >
                  Shkarko & Ngarko manualisht
                </button>
              </div>
            </form>
          )}

          {error && <div className="error-msg">⚠️ {error}</div>}
          {success && <div className="success-msg">✅ {success}</div>}
        </div>
      </div>
    </div>
  );
};

export default M3UUploader;
