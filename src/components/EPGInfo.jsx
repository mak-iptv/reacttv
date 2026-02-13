import React, { useState, useEffect } from 'react';

const EPGInfo = ({ channel, currentProgram, nextProgram, epgData = [], theme }) => {
  const [showFullEpg, setShowFullEpg] = useState(false);
  const [epgList, setEpgList] = useState([]);

  useEffect(() => {
    if (epgData && epgData.length > 0) {
      // Sort EPG by start time
      const sorted = [...epgData].sort((a, b) => a.start_timestamp - b.start_timestamp);
      setEpgList(sorted);
    }
  }, [epgData]);

  if (!channel) return null;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Sot';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Nesër';
    }
    return date.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
  };

  const getProgress = (start, end) => {
    if (!start || !end) return 0;
    const now = Math.floor(Date.now() / 1000);
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const progress = currentProgram ? getProgress(
    currentProgram.start_timestamp,
    currentProgram.end_timestamp
  ) : 0;

  return (
    <div className="epg-container">
      {/* Current Program - Now Playing */}
      {currentProgram && (
        <div className="epg-now-playing">
          <div className="epg-now-header">
            <span className="epg-now-badge">🔴 LIVE</span>
            <span className="epg-now-time">
              {formatTime(currentProgram.start_timestamp)} - {formatTime(currentProgram.end_timestamp)}
            </span>
          </div>
          
          <div className="epg-now-title">{currentProgram.title}</div>
          
          {currentProgram.description && (
            <div className="epg-now-description">{currentProgram.description}</div>
          )}
          
          {/* Progress Bar */}
          <div className="epg-progress-container">
            <div 
              className="epg-progress-bar" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Next Program */}
      {nextProgram && (
        <div className="epg-next">
          <span className="epg-next-label">⏭️ Në vijim:</span>
          <span className="epg-next-title">{nextProgram.title}</span>
          <span className="epg-next-time">
            {formatTime(nextProgram.start_timestamp)}
          </span>
        </div>
      )}

      {/* Full EPG Toggle */}
      {epgList.length > 0 && (
        <div className="epg-toggle">
          <button 
            className="epg-toggle-btn"
            onClick={() => setShowFullEpg(!showFullEpg)}
          >
            <span className="epg-toggle-icon">{showFullEpg ? '▼' : '▶'}</span>
            {showFullEpg ? 'Fshih programacionin' : 'Shfaq programacionin e plotë'}
            <span className="epg-count">{epgList.length} programe</span>
          </button>
        </div>
      )}

      {/* Full EPG List */}
      {showFullEpg && epgList.length > 0 && (
        <div className="epg-full-list">
          <div className="epg-list-header">
            <span className="epg-list-date">Data</span>
            <span className="epg-list-time">Ora</span>
            <span className="epg-list-title">Programi</span>
          </div>
          
          {epgList.map((program, index) => {
            const isCurrent = currentProgram && 
              program.start_timestamp === currentProgram.start_timestamp;
            const isPast = program.end_timestamp < Math.floor(Date.now() / 1000);
            
            return (
              <div 
                key={index} 
                className={`epg-list-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
              >
                <span className="epg-list-date-cell">{formatDate(program.start_timestamp)}</span>
                <span className="epg-list-time-cell">
                  {formatTime(program.start_timestamp)} - {formatTime(program.end_timestamp)}
                </span>
                <span className="epg-list-title-cell">
                  {program.title}
                  {isCurrent && <span className="epg-current-badge">Duke u luajtur</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EPGInfo;