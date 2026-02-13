import React from 'react';
import XtreamLogin from './XtreamLogin';
import M3UUploader from './M3UUploader';
import './WelcomeScreen.css';

const WelcomeScreen = ({ 
  theme,
  onXtreamClick,
  onM3UClick,
  onXtreamLogin,
  onM3ULoad,
  onCloseXtream,
  onCloseM3U,
  isLoading,
  showXtreamLogin,
  showM3UModal
}) => {
  return (
    <>
      {/* Welcome Screen */}
      <div className={`welcome-screen theme-${theme}`} data-theme={theme}>
        <div className="welcome-container">
          <h1 className="welcome-title">IPTV Player</h1>
          <p className="welcome-subtitle">
            Zgjidhni burimin për të filluar
          </p>

          <div className="welcome-buttons">
            <button 
              className="welcome-btn xtream"
              onClick={onXtreamClick}
              disabled={isLoading}
              type="button"
            >
              <span className="welcome-icon">📡</span>
              <span className="welcome-btn-title">Xtream Codes</span>
              <span className="welcome-btn-desc">
                Lidhu me server Xtream Codes
              </span>
            </button>

            <button 
              className="welcome-btn m3u"
              onClick={onM3UClick}
              disabled={isLoading}
              type="button"
            >
              <span className="welcome-icon">📋</span>
              <span className="welcome-btn-title">M3U Playlist</span>
              <span className="welcome-btn-desc">
                Ngarko playlist nga skedar ose URL
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showXtreamLogin && (
        <div className={`modal-overlay theme-${theme}`} data-theme={theme}>
          <XtreamLogin
            onLogin={onXtreamLogin}
            onClose={onCloseXtream}
            isLoading={isLoading}
            theme={theme}
          />
        </div>
      )}

      {showM3UModal && (
        <div className={`modal-overlay theme-${theme}`} data-theme={theme}>
          <M3UUploader
            onLoad={onM3ULoad}
            onClose={onCloseM3U}
            isLoading={isLoading}
            theme={theme}
          />
        </div>
      )}
    </>
  );
};

export default WelcomeScreen;