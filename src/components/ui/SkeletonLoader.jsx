'use client';

/**
 * SkeletonLoader Component
 * Modern skeleton screens for loading states
 * Replaces spinning loaders with content-aware placeholders
 */

// Base skeleton with shimmer effect
export function Skeleton({ className = "", variant = "default" }) {
  const baseStyles = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%] animate-shimmer";
  
  const variants = {
    default: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4",
    card: "rounded-xl"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} />
  );
}

// Card skeleton (for dashboard cards, stats, etc.)
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass p-6 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      {/* Content lines */}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-3" 
            style={{ width: `${100 - (i * 10)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Table skeleton (for data tables)
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-black/5 dark:bg-white/5 p-4 border-b border-black/10 dark:border-white/10">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-3" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats grid skeleton (for dashboard stats)
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass p-6 rounded-xl">
          <div className="flex items-center gap-4">
            <Skeleton variant="circle" className="w-12 h-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Form skeleton
export function SkeletonForm({ fields = 5 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
      
      {/* Submit button */}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-24" />
      </div>
    </div>
  );
}

// List skeleton (for lists of items)
export function SkeletonList({ items = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass p-4 rounded-lg flex items-center gap-4">
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function SkeletonProfile() {
  return (
    <div className="glass p-8 rounded-xl">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Avatar */}
        <Skeleton variant="circle" className="w-24 h-24" />
        
        {/* Info */}
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Form detail skeleton (for viewing submitted forms)
export function FormDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton variant="circle" className="w-16 h-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Form sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>

      {/* Department statuses */}
      <div className="glass p-6 rounded-xl">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-black/5 dark:bg-white/5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;