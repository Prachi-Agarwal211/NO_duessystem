'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { logDropdownError } from '@/lib/errorLogger';

/**
 * Error Boundary for Dropdown Components
 * Catches and handles errors in dropdown rendering and data fetching
 */
class DropdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logDropdownError(this.props.componentName || 'DropdownErrorBoundary', error, {
      errorInfo: errorInfo.componentStack,
      dropdownType: this.props.dropdownType
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional reset handler
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <DropdownErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          dropdownType={this.props.dropdownType}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI for Dropdown
 */
function DropdownErrorFallback({ error, onReset, dropdownType }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`
        relative w-full rounded-lg border px-3 py-4
        transition-all duration-300
        ${isDark
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-red-300 bg-red-50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium mb-1 ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}
          >
            Failed to load {dropdownType || 'options'}
          </p>
          <p
            className={`text-xs mb-3 ${
              isDark ? 'text-red-300/70' : 'text-red-600/70'
            }`}
          >
            {error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={onReset}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-200
              ${isDark
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                : 'bg-red-100 hover:bg-red-200 text-red-700'
              }
            `}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for handling dropdown errors
 */
export function useDropdownError(dropdownName) {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((err, context = {}) => {
    const errorLog = logDropdownError(dropdownName, err, context);
    setError({
      message: err?.message || 'An error occurred',
      log: errorLog
    });
  }, [dropdownName]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

/**
 * Wrapper component for dropdown with error boundary
 */
export function DropdownWithErrorBoundary({
  children,
  componentName,
  dropdownType,
  onReset
}) {
  return (
    <DropdownErrorBoundary
      componentName={componentName}
      dropdownType={dropdownType}
      onReset={onReset}
    >
      {children}
    </DropdownErrorBoundary>
  );
}

export default DropdownErrorBoundary;