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
    <div className={`xtream-login ${theme}`}>
      <button className="close" onClick={onClose}>×</button>

      <form onSubmit={handleSubmit}>
        <label>Server URL</label>
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="http://example.com:8080"
          disabled={isLoading}
          required
          autoComplete="off"
        />

        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          disabled={isLoading}
          required
          autoComplete="username"
        />

        <label>Password</label>
        <div className="password-field">
          <input
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
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            disabled={isLoading}
          >
            {showPassword ? '👁️' : '🙈'}
          </button>
        </div>

        <label>
          <input
            type="checkbox"
            checked={saveCredentials}
            onChange={(e) => setSaveCredentials(e.target.checked)}
            disabled={isLoading}
          />
          Ruaj të dhënat
        </label>

        <button type="submit" disabled={!isFormValid || isLoading}>
          {isLoading ? 'Duke u lidhur...' : 'Lidhu'}
        </button>
      </form>
    </div>
  );
};

// Default props
XtreamLogin.defaultProps = {
  isLoading: false,
  theme: 'dark',
};

export default XtreamLogin;
