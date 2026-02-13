import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <span className="error-icon">⚠️</span>
            <h2>Ndodhi një gabim</h2>
            <p>{this.state.error?.message || 'Gabim i panjohur'}</p>
            <button 
              className="error-boundary-reset"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Provo Përsëri
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;