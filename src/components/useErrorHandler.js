// useErrorHandler.js
import { useState, useCallback } from 'react';

const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [showError, setShowError] = useState(false);

  const handleError = useCallback((error, context = 'general') => {
    console.error(`${context} Error:`, error);

    let errorMessage = '';
    let errorCategory = 'unknown';

    // Network errors
    if (error.message?.includes('Network Error')) {
      errorMessage = 'Nuk mund të lidheni me serverin. Kontrolloni:';
      errorCategory = 'network';
    }
    // Timeout errors
    else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'Lidhja mori shumë kohë. Serveri nuk përgjigjet.';
      errorCategory = 'timeout';
    }
    // CORS errors
    else if (error.message?.includes('CORS')) {
      errorMessage = 'Problem me CORS. Serveri nuk lejon lidhje direkte.';
      errorCategory = 'cors';
    }
    // HTTP errors
    else if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage = 'Username ose password i gabuar.';
          errorCategory = 'auth';
          break;
        case 404:
          errorMessage = 'Serveri nuk u gjet. Kontrolloni URL-në.';
          errorCategory = 'not_found';
          break;
        case 500:
          errorMessage = 'Problem në server. Provo më vonë.';
          errorCategory = 'server';
          break;
        default:
          errorMessage = `Gabim serveri: ${error.response.status}`;
          errorCategory = 'http';
      }
    }
    // No response
    else if (error.request) {
      errorMessage = 'Serveri nuk po përgjigjet. Kontrolloni nëse është online.';
      errorCategory = 'no_response';
    }
    // Other errors
    else {
      errorMessage = error.message || 'Ndodhi një gabim i papritur.';
      errorCategory = 'unknown';
    }

    setError({
      message: errorMessage,
      originalError: error,
      category: errorCategory,
      context: context
    });
    setErrorType(errorCategory);
    setShowError(true);

    // Auto-hide after 5 seconds for non-critical errors
    if (errorCategory !== 'auth' && errorCategory !== 'network') {
      setTimeout(() => {
        setShowError(false);
      }, 5000);
    }

    return { errorMessage, errorCategory };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorType(null);
    setShowError(false);
  }, []);

  return {
    error,
    errorType,
    showError,
    handleError,
    clearError
  };
};

export default useErrorHandler;
