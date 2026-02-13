// src/components/M3UUploader.jsx
import React, { useState } from 'react';
import './M3UUploader.css';

const M3UUploader = ({ onLoad, onClose, isLoading, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState('file');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Parse M3U function
  const parseM3U = (content) => {
    if (!content || !content.includes('#EXTM3U')) {
      console.warn('Invalid M3U content');
      return [];
    }
    
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;
    
    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('#EXTINF:')) {
        try {
          // Parse EXTINF line
          // Format: #EXTINF:duration attributes,title
          const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.*?))?,(.*)/);
          if (match) {
            const duration = match[1];
            const attributes = match[2] || '';
            const name = match[3] || 'Pa emër';
            
            currentChannel = {
              id: `m3u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: name.trim(),
              title: name.trim(),
              tvg_name: name.trim(),
              duration: duration,
              tvg_logo: '',
              tvgLogo: '',
              group_title: '',
              groupTitle: '',
              group: '',
              url: '',
              stream_url: '',
              type: 'live',
              source: 'm3u'
            };
            
            // Parse tvg-logo
            const tvgLogoMatch = attributes.match(/tvg-logo="([^"]*)"/i);
            if (tvgLogoMatch) {
              currentChannel.tvg_logo = tvgLogoMatch[1];
              currentChannel.tvgLogo = tvgLogoMatch[1];
              currentChannel.logo = tvgLogoMatch[1];
            }
            
            // Parse group-title
            const groupMatch = attributes.match(/group-title="([^"]*)"/i);
            if (groupMatch) {
              currentChannel.group_title = groupMatch[1];
              currentChannel.groupTitle = groupMatch[1];
              currentChannel.group = groupMatch[1];
            }
            
            // Parse tvg-id
            const tvgIdMatch = attributes.match(/tvg-id="([^"]*)"/i);
            if (tvgIdMatch) {
              currentChannel.tvg_id = tvgIdMatch[1];
              currentChannel.tvgId = tvgIdMatch[1];
            }
            
            // Parse tvg-name
            const tvgNameMatch = attributes.match(/tvg-name="([^"]*)"/i);
            if (tvgNameMatch) {
              currentChannel.tvg_name = tvgNameMatch[1];
              currentChannel.tvgName = tvgNameMatch[1];
            }
          }
        } catch (err) {
          console.error('Error parsing EXTINF:', err);
        }
      } else if (!line.startsWith('#') && currentChannel) {
        // This is the URL line
        if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://')) {
          currentChannel.url = line;
          currentChannel.stream_url = line;
          channels.push({ ...currentChannel });
        }
        currentChannel = null;
      } else if (line.startsWith('#EXTGRP:')) {
        // Group assignment
        const group = line.replace('#EXTGRP:', '').trim();
        if (currentChannel) {
          currentChannel.group_title = group;
          currentChannel.groupTitle = group;
          currentChannel.group = group;
        }
      }
    });
    
    console.log(`✅ Parsed ${channels.length} channels from M3U`);
    return channels;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setError('');
    setSuccess('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const channels = parseM3U(content);
        
        if (channels.length === 0) {
          setError('Nuk u gjet asnjë kanal në file. Kontrollo formatin M3U.');
          return;
        }
        
        onLoad({ 
          type: 'file', 
          content, 
          channels,
          filename: file.name 
        });
        
        setSuccess(`✅ ${channels.length} kanale u ngarkuan nga ${file.name}`);
        
        // Reset file input
        event.target.value = '';
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Gabim gjatë leximit të file-it. Kontrollo formatin.');
      }
    };
    
    reader.onerror = () => {
      setError('Gabim gjatë leximit të file-it');
    };
    
    reader.readAsText(file);
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Shkruani URL-në e playlist-it');
      return;
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      setError('URL nuk është e vlefshme');
      return;
    }
    
    setError('');
    setSuccess('');
    
    // Hap URL në shfletues që përdoruesi ta shkarkojë
    window.open(url, '_blank');
    setSuccess('✅ Playlist po shkarkohet! Tani shko te "Nga File" dhe ngarko file-in e shkarkuar.');
    
    // Switch to file tab
    setTimeout(() => {
      setActiveTab('file');
    }, 1500);
  };

  const handleQuickDownload = () => {
    const downloadUrl = 'http://bmedia.vip/get.php?username=Hadimovic2428&password=TGjJm4rv7H&type=m3u_plus&output=m3u8';
    window.open(downloadUrl, '_blank');
    setSuccess('✅ Playlist po shkarkohet! Tani ngarko file-in duke klikuar "Zgjidh skedar M3U".');
    
    // Switch to file tab
    setTimeout(() => {
      setActiveTab('file');
    }, 1500);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className={`xtream-modal-overlay theme-${theme}`} onClick={onClose}>
      <div className="xtream-modal" onClick={(e) => e.stopPropagation()}>
        <div className="xtream-modal-header">
          <div className="xtream-modal-title">
            <span className="xtream-icon">📋</span>
            <h2>Ngarko M3U Playlist</h2>
          </div>
          <button 
            className="xtream-close-btn" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className="xtream-modal-body">
          {/* Tabs */}
          <div className="m3u-tabs">
            <button 
              className={`m3u-tab ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('file');
                clearMessages();
              }}
              disabled={isLoading}
            >
              <span className="tab-icon">📁</span>
              <span className="tab-text">Nga File</span>
            </button>
            <button 
              className={`m3u-tab ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('url');
                clearMessages();
              }}
              disabled={isLoading}
            >
              <span className="tab-icon">🔗</span>
              <span className="tab-text">Nga URL</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="m3u-tab-content">
            {activeTab === 'file' && (
              <div className="m3u-file-upload">
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept=".m3u,.m3u8,text/plain,.txt"
                    onChange={handleFileUpload}
                    id="m3u-file-input"
                    disabled={isLoading}
                  />
                  <label htmlFor="m3u-file-input" className="file-upload-label">
                    <span className="upload-icon">📁</span>
                    <span className="upload-text">Zgjidh skedar M3U</span>
                    <span className="upload-hint">.m3u ose .m3u8</span>
                  </label>
                </div>
                
                <div className="info-box">
                  <h4>📋 Si të ngarkoni M3U:</h4>
                  <ol>
                    <li><strong>Shkarko playlist-in</strong> - Kliko butonin më poshtë</li>
                    <li><strong>Ruaj file-in</strong> - Në kompjuterin tuaj</li>
                    <li><strong>Ngarko këtu</strong> - Zgjidh file-in e shkarkuar</li>
                  </ol>
                </div>

                <div className="quick-download">
                  <p className="download-title">🎯 Shkarko playlist tani:</p>
                  <button
                    type="button"
                    className="download-btn"
                    onClick={handleQuickDownload}
                    disabled={isLoading}
                  >
                    <span className="btn-icon">⬇️</span>
                    <span className="btn-text">Shkarko M3U Playlist</span>
                  </button>
                  <p className="download-note">
                    Kjo do të hapë URL-në në shfletues. Ruaj file-in dhe ngarko këtu.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'url' && (
              <form onSubmit={handleUrlSubmit} className="m3u-url-form">
                <div className="xtream-form-group">
                  <label htmlFor="m3u-url">M3U URL</label>
                  <input
                    id="m3u-url"
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      clearMessages();
                    }}
                    placeholder="https://example.com/playlist.m3u"
                    disabled={isLoading}
                  />
                  
                  <div className="info-box warning">
                    <strong>⚠️ Informacion i rëndësishëm:</strong>
                    <p>Serveri nuk lejon ngarkim direkt të URL-ve. URL do të hapet në shfletues që ju ta shkarkoni file-in.</p>
                  </div>
                  
                  <button
                    type="button"
                    className="open-url-btn"
                    onClick={() => {
                      if (url) {
                        window.open(url, '_blank');
                        setSuccess('✅ Playlist po shkarkohet! Tani shko te "Nga File" dhe ngarko file-in.');
                        setTimeout(() => setActiveTab('file'), 1500);
                      } else {
                        setError('Shkruani URL-në e playlist-it');
                      }
                    }}
                    disabled={!url || isLoading}
                  >
                    <span className="btn-icon">🔗</span>
                    <span className="btn-text">Hap URL në shfletues</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="error-message">
              <span className="message-icon">⚠️</span>
              <span className="message-text">{error}</span>
              <button className="message-close" onClick={clearMessages}>×</button>
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <span className="message-icon">✅</span>
              <span className="message-text">{success}</span>
              <button className="message-close" onClick={clearMessages}>×</button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Duke ngarkuar playlist-in...</p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="m3u-footer">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isLoading}
            >
              Anulo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default M3UUploader;