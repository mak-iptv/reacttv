// XtreamLogin.jsx
import React, { useState } from 'react';
import './XtreamLogin.css';

const XtreamLogin = ({ onLogin, onClose, isLoading = false, theme = 'dark' }) => {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ server, username, password, saveCredentials });
  };

  const isFormValid = server.trim() !== '' && username.trim() !== '' && password.trim() !== '';

  return (
    <div className={`xtream-modal-overlay theme-${theme}`}>
      <div className="xtream-modal">
        <div className="xtream-modal-header">
          <div className="xtream-modal-title">
            <span className="xtream-icon" role="img" aria-label="xtream logo">📡</span>
            <h2>Xtream Codes Login</h2>
          </div>
          <button 
            className="xtream-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className="xtream-modal-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="xtream-form-group">
              <label htmlFor="server-url">Server URL</label>
              <input
                id="server-url"
                type="url"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="http://example.com:8080"
                disabled={isLoading}
                required
                autoComplete="off"
              />
            </div>

            <div className="xtream-form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={isLoading}
                required
                autoComplete="username"
              />
            </div>

            <div className="xtream-form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="xtream-checkbox-group">
              <label htmlFor="save-credentials">
                <input
                  id="save-credentials"
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  disabled={isLoading}
                />
                Ruaj të dhënat
              </label>
            </div>

            <div className="xtream-form-actions">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isLoading}
                className="xtream-btn-secondary"
              >
                Anulo
              </button>
              <button 
                type="submit" 
                disabled={!isFormValid || isLoading}
                className="xtream-btn-primary"
              >
                {isLoading ? 'Duke u lidhur...' : 'Lidhu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Default props
XtreamLogin.defaultProps = {
  isLoading: false,
  theme: 'dark'
};

export default XtreamLogin;
