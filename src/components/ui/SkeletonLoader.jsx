'use client';

/**
 * SkeletonLoader Component
 * 
 * Provides smooth, animated loading placeholders with proper accessibility.
 * Optimized for performance with GPU acceleration.
 * 
 * Usage:
 * <SkeletonLoader variant="text" width="200px" />
 * <SkeletonLoader variant="card" height="150px" />
 * <SkeletonLoader variant="table" rows={5} />
 */

export default function SkeletonLoader({ 
  variant = 'text', 
  width = '100%', 
  height = '20px',
  rows = 3,
  className = ''
}) {
  // Base skeleton styles with shimmer animation
  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded shimmer";

  // Render different skeleton variants
  switch (variant) {
    case 'text':
      return (
        <div 
          className={`${baseClasses} ${className}`}
          style={{ width, height }}
          role="status"
          aria-label="Loading content"
        >
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'title':
      return (
        <div className="space-y-2">
          <div 
            className={`${baseClasses} h-8 w-3/4`}
            role="status"
            aria-label="Loading title"
          >
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      );

    case 'paragraph':
      return (
        <div className="space-y-3" role="status" aria-label="Loading paragraph">
          {Array.from({ length: rows }).map((_, index) => (
            <div 
              key={index}
              className={`${baseClasses} h-4`}
              style={{ 
                width: index === rows - 1 ? '80%' : '100%' 
              }}
            />
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'card':
      return (
        <div 
          className={`${baseClasses} rounded-lg ${className}`}
          style={{ width, height: height || '200px' }}
          role="status"
          aria-label="Loading card"
        >
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'avatar':
      return (
        <div 
          className={`${baseClasses} rounded-full ${className}`}
          style={{ 
            width: width || '48px', 
            height: height || '48px' 
          }}
          role="status"
          aria-label="Loading avatar"
        >
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'button':
      return (
        <div 
          className={`${baseClasses} rounded-lg ${className}`}
          style={{ 
            width: width || '120px', 
            height: height || '40px' 
          }}
          role="status"
          aria-label="Loading button"
        >
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'table':
      return (
        <div className="space-y-3" role="status" aria-label="Loading table">
          {/* Table header */}
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={`header-${index}`}
                className={`${baseClasses} h-10 flex-1`}
              />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex gap-4">
              {Array.from({ length: 4 }).map((_, colIndex) => (
                <div 
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`${baseClasses} h-12 flex-1`}
                />
              ))}
            </div>
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-4" role="status" aria-label="Loading form">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="space-y-2">
              {/* Label */}
              <div className={`${baseClasses} h-4 w-24`} />
              {/* Input field */}
              <div className={`${baseClasses} h-10 w-full`} />
            </div>
          ))}
          {/* Submit button */}
          <div className={`${baseClasses} h-10 w-32`} />
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'dashboard':
      return (
        <div className="space-y-6" role="status" aria-label="Loading dashboard">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`stat-${index}`} className={`${baseClasses} h-32 rounded-lg`} />
            ))}
          </div>
          {/* Main content area */}
          <div className={`${baseClasses} h-96 rounded-lg`} />
          <span className="sr-only">Loading...</span>
        </div>
      );

    case 'list':
      return (
        <div className="space-y-3" role="status" aria-label="Loading list">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              {/* Icon/Avatar */}
              <div className={`${baseClasses} h-10 w-10 rounded-full flex-shrink-0`} />
              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className={`${baseClasses} h-4 w-3/4`} />
                <div className={`${baseClasses} h-3 w-1/2`} />
              </div>
            </div>
          ))}
          <span className="sr-only">Loading...</span>
        </div>
      );

    default:
      return (
        <div 
          className={`${baseClasses} ${className}`}
          style={{ width, height }}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      );
  }
}

/**
 * Compound Skeleton Components for common patterns
 */

// Profile Card Skeleton
export function SkeletonProfileCard() {
  return (
    <div className="glass p-6 rounded-lg space-y-4" role="status" aria-label="Loading profile">
      <div className="flex items-center gap-4">
        <SkeletonLoader variant="avatar" width="64px" height="64px" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" height="24px" />
          <SkeletonLoader variant="text" width="40%" height="16px" />
        </div>
      </div>
      <SkeletonLoader variant="paragraph" rows={3} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Data Table Skeleton
export function SkeletonDataTable({ rows = 5 }) {
  return (
    <div className="glass rounded-lg overflow-hidden" role="status" aria-label="Loading table">
      <SkeletonLoader variant="table" rows={rows} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Dashboard Stats Skeleton
export function SkeletonDashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading statistics">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass p-6 rounded-lg space-y-3">
          <SkeletonLoader variant="text" width="50%" height="16px" />
          <SkeletonLoader variant="text" width="70%" height="32px" />
          <SkeletonLoader variant="text" width="60%" height="14px" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Form Skeleton with proper structure
export function SkeletonForm({ fields = 4 }) {
  return (
    <div className="glass p-6 rounded-lg" role="status" aria-label="Loading form">
      <SkeletonLoader variant="title" />
      <div className="mt-6">
        <SkeletonLoader variant="form" rows={fields} />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}