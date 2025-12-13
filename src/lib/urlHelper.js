/**
 * URL Helper Utilities
 * Centralized base URL management for consistent URL generation across the application
 */

/**
 * Get the application base URL with fallback chain
 * Priority: NEXT_PUBLIC_BASE_URL > NEXT_PUBLIC_APP_URL > Vercel URL > localhost
 * 
 * @returns {string} The base URL without trailing slash
 */
export function getBaseUrl() {
  // 1st priority: NEXT_PUBLIC_BASE_URL (recommended)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  // 2nd priority: NEXT_PUBLIC_APP_URL (legacy support)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 3rd priority: Vercel URL (auto-populated in Vercel deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4th priority: Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Final fallback (should never reach here in production)
  console.warn('⚠️ No base URL configured. Using production domain as fallback.');
  return 'https://nodues.jecrcuniversity.edu.in';
}

/**
 * Generate a full URL with path
 * @param {string} path - The path to append (should start with /)
 * @returns {string} Full URL
 */
export function getFullUrl(path) {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get common application URLs
 */
export const APP_URLS = {
  /**
   * Staff login page
   * @returns {string}
   */
  staffLogin: () => getFullUrl('/staff/login'),

  /**
   * Staff dashboard
   * @returns {string}
   */
  staffDashboard: () => getFullUrl('/staff/dashboard'),

  /**
   * Student form by ID
   * @param {string} formId - The form ID
   * @returns {string}
   */
  staffStudentForm: (formId) => getFullUrl(`/staff/student/${formId}`),

  /**
   * Student status check page
   * @param {string} registrationNo - Student registration number
   * @returns {string}
   */
  studentCheckStatus: (registrationNo) => 
    getFullUrl(`/student/check-status?reg=${encodeURIComponent(registrationNo)}`),

  /**
   * Certificate generation API
   * @returns {string}
   */
  certificateGenerateApi: () => getFullUrl('/api/certificate/generate'),

  /**
   * Email queue processor API
   * @returns {string}
   */
  emailQueueApi: () => getFullUrl('/api/email/process-queue'),

  /**
   * Admin dashboard
   * @returns {string}
   */
  adminDashboard: () => getFullUrl('/admin'),
};

/**
 * Validate if a URL is properly configured
 * @returns {boolean}
 */
export function isBaseUrlConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Get environment info for debugging
 * @returns {object}
 */
export function getUrlEnvironmentInfo() {
  return {
    baseUrl: getBaseUrl(),
    source: process.env.NEXT_PUBLIC_BASE_URL
      ? 'NEXT_PUBLIC_BASE_URL'
      : process.env.NEXT_PUBLIC_APP_URL
      ? 'NEXT_PUBLIC_APP_URL'
      : process.env.VERCEL_URL
      ? 'VERCEL_URL'
      : 'fallback',
    isConfigured: isBaseUrlConfigured(),
    environment: process.env.NODE_ENV,
  };
}

export default {
  getBaseUrl,
  getFullUrl,
  APP_URLS,
  isBaseUrlConfigured,
  getUrlEnvironmentInfo,
};