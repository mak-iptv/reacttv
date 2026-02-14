import React, { useState } from 'react';
import './XtreamLogin.css';

const XtreamLogin = ({ onLogin, onClose, isLoading = false, theme = 'dark' }) => {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(true);

  const normalizeServer = (url) => {
    let clean = url.trim();

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }

    return clean.replace(/\/+$/, ''); // heq slash në fund
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!server || !username || !password) {
      setError('Plotëso të gjitha fushat.');
      return;
    }

    const cleanServer = normalizeServer(server);

    try {
      await onLogin({
        server: cleanServer,
        username: username.trim(),
        password: password.trim(),
        saveCredentials
      });
    } catch (err) {
      setError(err.message || 'Gabim gjatë lidhjes me serverin.');
    }
  };

  const isFormValid =
    server.trim() !== '' &&
    username.trim() !== '' &&
    password.trim() !== '';

  return (
    <div className={`xtream-login ${theme}`}>
      <button className="close" onClick={onClose}>×</button>

      <form onSubmit={handleSubmit}>
        <h2>Xtream Login</h2>

        {error && <div className="error-message">{error}</div>}

        <label>Server URL</label>
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="example.com:8080"
          disabled={isLoading}
          required
        />

        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          required
        />

        <label>Password</label>
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? '👁️' : '🙈'}
          </button>
        </div>

        <label className="checkbox">
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

export default XtreamLogin;
