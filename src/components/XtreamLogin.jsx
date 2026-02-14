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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const validateServerUrl = (url) => {
    try {
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'http://' + formattedUrl;
      }
      new URL(formattedUrl);
      return { valid: true, url: formattedUrl };
    } catch {
      return { valid: false, url };
    }
  };

  const validateForm = () => {
    setError('');

    if (!server.trim()) {
      setError('Ju lutem vendosni server URL');
      return false;
    }

    const { valid, url } = validateServerUrl(server);
    if (!valid) {
      setError('Server URL nuk është valid. P.sh: http://example.com:8080');
      return false;
    }

    if (!username.trim()) {
      setError('Ju lutem vendosni username');
      return false;
    }

    if (!password.trim()) {
      setError('Ju lutem vendosni password');
      return false;
    }

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

    setIsLoggingIn(true);
    setError('');

    console.log('🔐 Login attempt:', { 
      server: server.trim(), 
      username: username.trim(),
    });

    try {
      // Përdor relative URL për Vercel
      const response = await fetch('/api/xtream-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          server: server.trim(), 
          username: username.trim(), 
          password: password.trim(),
        }),
      });

      console.log('📡 Response status:', response.status);
      
      // Lexo response si text fillimisht
      const responseText = await response.text();
      console.log('📦 Response length:', responseText.length);
      console.log('📦 Response preview:', responseText.substring(0, 200));

      // Kontrollo nëse përgjigja është bosh
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Serveri nuk po kthen përgjigje');
      }

      // Provo të parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        
        // Nëse nuk është JSON, trego përgjigjen e parë
        setError(
          <div className="error-detailed">
            <p><strong>Përgjigja nga serveri nuk është JSON:</strong></p>
            <pre className="error-preview">
              {responseText.substring(0, 300)}
            </pre>
            <p className="error-hint">
              Kjo mund të ndodhë nëse:
              <br/>• URL e serverit është e gabuar
              <br/>• Serveri nuk mbështet Xtream Codes API
              <br/>• Serveri kërkon autentikim shtesë
            </p>
          </div>
        );
        setIsLoggingIn(false);
        return;
      }

      // Kontrollo nëse ka error nga proxy
      if (data.error) {
        throw new Error(data.error);
      }

      // Kontrollo nëse ka sukses
      if (data.success || data.user_info || data.user || data.data) {
        console.log('✅ Login successful');
        
        // Ruaj kredencialet nëse është zgjedhur
        if (saveCredentials) {
          try {
            localStorage.setItem('xtream_credentials', JSON.stringify({
              server: server.trim(),
              username: username.trim(),
              lastLogin: new Date().toISOString()
            }));
          } catch (storageError) {
            console.warn('Could not save credentials:', storageError);
          }
        }
        
        // Thirr onLogin me të dhënat
        onLogin(data);
        onClose();
      } else {
        console.error('❌ Invalid response:', data);
        setError('Përgjigja nga serveri nuk është e vlefshme');
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Lidhja dështoi. Kontrollo serverin dhe kredencialet.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleServerBlur = () => {
    if (server && !server.startsWith('http://') && !server.startsWith('https://')) {
      setServer('http://' + server);
    }
  };

  // Load saved credentials on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('xtream_credentials');
      if (saved) {
        const { server: savedServer, username: savedUsername } = JSON.parse(saved);
        if (savedServer) setServer(savedServer);
        if (savedUsername) setUsername(savedUsername);
      }
    } catch (error) {
      console.warn('Could not load saved credentials:', error);
    }
  }, []);

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
            disabled={isLoggingIn || isLoading}
          >
            ×
          </button>
        </div>
        
        <div className="xtream-modal-body">
          {error && (
            <div className="xtream-error-message" role="alert">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                {typeof error === 'string' ? error : error}
              </div>
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
                disabled={isLoggingIn || isLoading}
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
                disabled={isLoggingIn || isLoading}
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
                  disabled={isLoggingIn || isLoading}
                  required
                  autoComplete="current-password"
                  className={error && !password ? 'error' : ''}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoggingIn || isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="xtream-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  disabled={isLoggingIn || isLoading}
                />
                <span className="checkbox-text">Ruaj të dhënat (për herën tjetër)</span>
              </label>
            </div>

            <div className="xtream-form-actions">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isLoggingIn || isLoading}
                className="xtream-btn-secondary"
              >
                Anulo
              </button>
              <button 
                type="submit" 
                disabled={!isFormValid || isLoggingIn || isLoading}
                className="xtream-btn-primary"
              >
                {isLoggingIn ? (
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

          {(isLoggingIn || isLoading) && (
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

XtreamLogin.defaultProps = {
  isLoading: false,
  theme: 'dark',
  onLogin: () => {},
  onClose: () => {}
};

export default XtreamLogin;
