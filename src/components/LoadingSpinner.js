// src/components/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ theme = 'dark', size = 'medium' }) => {
  return (
    <div className={`loading-spinner-container theme-${theme} size-${size}`}>
      <div className="loading-spinner"></div>
      <span className="loading-text">Duke ngarkuar...</span>
    </div>
  );
};

export default LoadingSpinner;