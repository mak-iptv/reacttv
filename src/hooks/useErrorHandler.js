import { useState, useCallback } from 'react';
import { APP_CONSTANTS } from '../constants/iptv';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleError = useCallback((err, customMessage) => {
    console.error('IPTV Error:', err);
    setError(customMessage || err?.message || 'Ndodhi një gabim');
    
    setTimeout(() => setError(null), APP_CONSTANTS.AUTO_HIDE_ERROR);
  }, []);

  const handleSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), APP_CONSTANTS.AUTO_HIDE_SUCCESS);
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { error, success, handleError, handleSuccess, clearMessages };
};