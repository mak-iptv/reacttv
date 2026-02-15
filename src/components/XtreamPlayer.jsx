import React, { useEffect, useState } from 'react';
import HlsPlayer from './HlsPlayer';

const TABS = ['live', 'movie', 'series'];

const XtreamPlayer = ({ server, username, password }) => {
  const [streams, setStreams] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [currentStream, setCurrentStream] = useState(null);

  // Merr streams nga backend
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const res = await fetch(
          `/api/xtream?server=${encodeURIComponent(server)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        );
        const data = await res.json();
        if (data.streams) setStreams(data.streams);
      } catch (err) {
        console.error('Gabim gjatë marrjes së streams:', err);
      }
    };
    fetchStreams();
  }, [server, username, password]);

  // Filtron streams sipas tab-it aktiv
  const filteredStreams = streams.filter(s => s.type === activeTab);

  return (
    <div className="xtream-player">
      {/* Tabs */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stream list */}
      <div className="stream-list">
        {filteredStreams.length === 0 && <p>Nuk ka stream për këtë kategori</p>}
        {filteredStreams.map(stream => (
          <div
            key={stream.id}
            className="stream-item"
            onClick={() => setCurrentStream(`/api/stream?url=${encodeURIComponent(stream.url)}`)}
          >
            {stream.logo && <img src={stream.logo} alt={stream.name} className="stream-logo" />}
            <span>{stream.name}</span>
          </div>
        ))}
      </div>

      {/* HlsPlayer */}
      {currentStream && (
        <div className="player-container">
          <HlsPlayer
            src={currentStream}
            isPlaying={true}
            theme="dark"
          />
        </div>
      )}
    </div>
  );
};

export default XtreamPlayer;
