import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ error, success, onClose, theme = 'dark', duration = 5000 }) => {
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [error, success, onClose, duration]);

  if (!error && !success) return null;

  return (
    <div className={`toast-container theme-${theme}`}>
      {error && (
        <div className="toast toast-error">
          <span className="toast-icon">⚠️</span>
          <span className="toast-message">{error}</span>
          <button className="toast-close" onClick={onClose} aria-label="Mbyll">
            ×
          </button>
        </div>
      )}
      
      {success && (
        <div className="toast toast-success">
          <span className="toast-icon">✅</span>
          <span className="toast-message">{success}</span>
          <button className="toast-close" onClick={onClose} aria-label="Mbyll">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Toast;