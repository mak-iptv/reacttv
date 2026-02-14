// XtreamLogin.jsx
import React, { useState } from 'react';
import './XtreamLogin.css';

const XtreamLogin = ({ onLogin, onClose, isLoading = false, theme = 'dark' }) => {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [error, setError] = useState('');

  const validateServerUrl = (url) => {
    try {
      // Shto http:// nëse nuk ka
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      new URL(url);
      return { valid: true, url };
    } catch {
      return { valid: false, url };
    }
  };

  const validateForm = () => {
    // Reset error
    setError('');

    // Check server
    if (!server.trim()) {
      setError('Ju lutem vendosni server URL');
      return false;
    }

    // Validate server URL format
    const { valid, url } = validateServerUrl(server);
    if (!valid) {
      setError('Server URL nuk është valid. P.sh: http://example.com:8080');
      return false;
    }

    // Check username
    if (!username.trim()) {
      setError('Ju lutem vendosni username');
      return false;
    }

    // Check password
    if (!password.trim()) {
      setError('Ju lutem vendosni password');
      return false;
    }

    // Update server with corrected URL
    if (url !== server) {
      setServer(url);
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Log për debugging
    console.log('🔐 Login attempt:', { 
      server, 
      username: username.trim(),
      hasPassword: !!password 
    });

    try {
      // Përdor proxy-in e Vercel
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${API_URL}/api/xtream-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          server: server.trim(), 
          username: username.trim(), 
          password: password.trim(),
          saveCredentials 
        }),
      });

      console.log('📡 Response status:', response.status);

      // Lexo response-in si text fillimisht
      const responseText = await response.text();
      console.log('📦 Raw response:', responseText);

      // Parse JSON nëse është e mundur
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Përgjigja nga serveri nuk është e vlefshme');
      }

      // Kontrollo nëse ka error nga serveri
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Kredencialet e gabuara');
      }

      // Verifiko nëse të dhënat janë të sakta
      if (data.user_info || data.user || data.data) {
        console.log('✅ Login successful');
        onLogin({ 
          ...data, 
          credentials: { server, username: username.trim() } 
        });
      } else {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Kredencialet e gabuara');
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Lidhja dështoi. Kontrollo serverin dhe kredencialet.');
    }
  };

  const handleServerBlur = () => {
    // Auto-format server URL kur humb fokus
    if (server && !server.startsWith('http://') && !server.startsWith('https://')) {
      setServer('http://' + server);
    }
  };

  const isFormValid = server.trim() && username.trim() && password.trim();

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
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className="xtream-modal-body">
          {error && (
            <div className="xtream-error-message" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button 
                className="error-close" 
                onClick={() => setError('')}
                aria-label="Close error message"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="xtream-form-group">
              <label htmlFor="server-url">
                Server URL <span className="required">*</span>
              </label>
              <input
                id="server-url"
                type="url"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                onBlur={handleServerBlur}
                placeholder="http://example.com:8080"
                disabled={isLoading}
                required
                autoComplete="off"
                spellCheck="false"
                className={error && !server ? 'error' : ''}
              />
              <small className="input-hint">
                P.sh: http://example.com:8080 ose https://example.com
              </small>
            </div>

            <div className="xtream-form-group">
              <label htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={isLoading}
                required
                autoComplete="username"
                spellCheck="false"
                className={error && !username ? 'error' : ''}
              />
            </div>

            <div className="xtream-form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
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
                  className={error && !password ? 'error' : ''}
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
              <label htmlFor="save-credentials" className="checkbox-label">
                <input
                  id="save-credentials"
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkbox-text">Ruaj të dhënat</span>
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
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    <span>Duke u lidhur...</span>
                  </>
                ) : (
                  'Lidhu'
                )}
              </button>
            </div>
          </form>

          {isLoading && (
            <div className="xtream-loading-overlay">
              <div className="xtream-loading-spinner"></div>
              <p>Duke u lidhur me serverin...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Default props
XtreamLogin.defaultProps = {
  isLoading: false,
  theme: 'dark',
  onLogin: () => {},
  onClose: () => {}
};

export default XtreamLogin;
