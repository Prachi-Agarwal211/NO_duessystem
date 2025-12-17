/**
 * Centralized Error Logging Utility
 * Provides consistent error logging across the application with context and timestamps
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Format error for logging
 */
function formatError(level, component, error, context = {}) {
  return {
    level,
    component,
    message: error?.message || error,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };
}

/**
 * Log dropdown-specific errors with enhanced context
 */
export function logDropdownError(component, error, context = {}) {
  const errorLog = formatError(LOG_LEVELS.ERROR, component, error, {
    ...context,
    type: 'DROPDOWN_ERROR'
  });
  
  console.error(`[DROPDOWN_ERROR] ${component}:`, errorLog);
  
  // In production, send to error tracking service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Example: Sentry.captureException(error, { extra: errorLog });
  }
  
  return errorLog;
}

/**
 * Log API errors with request/response context
 */
export function logApiError(endpoint, error, context = {}) {
  const errorLog = formatError(LOG_LEVELS.ERROR, 'API', error, {
    ...context,
    endpoint,
    type: 'API_ERROR'
  });
  
  console.error(`[API_ERROR] ${endpoint}:`, errorLog);
  
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
  }
  
  return errorLog;
}

/**
 * Log data validation errors
 */
export function logValidationError(field, error, value, context = {}) {
  const errorLog = formatError(LOG_LEVELS.WARN, 'VALIDATION', error, {
    ...context,
    field,
    value: typeof value === 'string' ? value.substring(0, 100) : value,
    type: 'VALIDATION_ERROR'
  });
  
  console.warn(`[VALIDATION_ERROR] ${field}:`, errorLog);
  
  return errorLog;
}

/**
 * Log form submission errors
 */
export function logFormError(formType, error, formData = {}, context = {}) {
  // Sanitize sensitive data
  const sanitizedData = { ...formData };
  delete sanitizedData.password;
  delete sanitizedData.personal_email;
  delete sanitizedData.college_email;
  
  const errorLog = formatError(LOG_LEVELS.ERROR, 'FORM', error, {
    ...context,
    formType,
    formData: sanitizedData,
    type: 'FORM_ERROR'
  });
  
  console.error(`[FORM_ERROR] ${formType}:`, errorLog);
  
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
  }
  
  return errorLog;
}

/**
 * Log data synchronization issues
 */
export function logSyncError(source, target, error, context = {}) {
  const errorLog = formatError(LOG_LEVELS.ERROR, 'SYNC', error, {
    ...context,
    source,
    target,
    type: 'SYNC_ERROR'
  });
  
  console.error(`[SYNC_ERROR] ${source} -> ${target}:`, errorLog);
  
  return errorLog;
}

/**
 * Log performance issues
 */
export function logPerformanceWarning(component, metric, value, threshold, context = {}) {
  const warningLog = {
    level: LOG_LEVELS.WARN,
    component,
    message: `Performance threshold exceeded: ${metric}`,
    context: {
      ...context,
      metric,
      value,
      threshold,
      exceeded: value - threshold,
      type: 'PERFORMANCE_WARNING'
    },
    timestamp: new Date().toISOString()
  };
  
  console.warn(`[PERFORMANCE_WARNING] ${component}:`, warningLog);
  
  return warningLog;
}

/**
 * Log successful operations (for debugging)
 */
export function logSuccess(component, message, context = {}) {
  if (process.env.NODE_ENV === 'development') {
    const successLog = {
      level: LOG_LEVELS.INFO,
      component,
      message,
      context,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[SUCCESS] ${component}:`, successLog);
  }
}

/**
 * Log debug information
 */
export function logDebug(component, message, data = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${component}:`, {
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Create contextual logger for a specific component
 */
export function createLogger(componentName) {
  return {
    error: (error, context) => logDropdownError(componentName, error, context),
    apiError: (endpoint, error, context) => logApiError(endpoint, error, { ...context, component: componentName }),
    validation: (field, error, value, context) => logValidationError(field, error, value, { ...context, component: componentName }),
    warn: (message, context) => {
      const warningLog = {
        level: LOG_LEVELS.WARN,
        component: componentName,
        message,
        context,
        timestamp: new Date().toISOString()
      };
      console.warn(`[WARN] ${componentName}:`, warningLog);
      return warningLog;
    },
    success: (message, context) => logSuccess(componentName, message, context),
    debug: (message, data) => logDebug(componentName, message, data),
    performance: (metric, value, threshold, context) => logPerformanceWarning(componentName, metric, value, threshold, context)
  };
}

export default {
  logDropdownError,
  logApiError,
  logValidationError,
  logFormError,
  logSyncError,
  logPerformanceWarning,
  logSuccess,
  logDebug,
  createLogger
};