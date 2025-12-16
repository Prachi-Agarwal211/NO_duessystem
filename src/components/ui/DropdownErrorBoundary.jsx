'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * DropdownErrorBoundary - Error boundary specifically for dropdown components
 * Catches errors in school/course/branch dropdowns and provides recovery UI
 */
class DropdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dropdown Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const { componentName = 'Component', dropdownType = 'dropdown' } = this.props;

      return (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                {componentName} Error
              </h3>
              <p className="text-xs text-red-600 dark:text-red-300 mb-3">
                Failed to load {dropdownType}. This might be due to a network issue or data loading problem.
              </p>
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                  bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 
                  hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * DropdownWithErrorBoundary - Wrapper component for easier use
 * Usage: <DropdownWithErrorBoundary componentName="School Dropdown" dropdownType="schools">
 */
export function DropdownWithErrorBoundary({ 
  children, 
  componentName = 'Dropdown', 
  dropdownType = 'items',
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