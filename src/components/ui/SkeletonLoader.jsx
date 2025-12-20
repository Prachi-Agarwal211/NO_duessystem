'use client';

/**
 * Reusable skeleton loader components for loading states
 * Professional shimmer animation
 */

export function SkeletonBox({ className = '', width = 'w-full', height = 'h-4' }) {
  return (
    <div className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox 
          key={i} 
          width={i === lines - 1 ? 'w-2/3' : 'w-full'}
          height="h-3"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <SkeletonBox width="w-12" height="h-12" className="rounded-full" />
        <div className="flex-1">
          <SkeletonBox width="w-1/2" height="h-4" className="mb-2" />
          <SkeletonBox width="w-1/3" height="h-3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBox key={`header-${i}`} height="h-6" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBox key={`cell-${rowIndex}-${colIndex}`} height="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDropdownOptions({ count = 5 }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <SkeletonBox width="w-5" height="h-5" className="rounded" />
          <SkeletonBox width="w-full" height="h-4" />
        </div>
      ))}
    </div>
  );
}

export function FormDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-3">
          <SkeletonBox width="w-48" height="h-8" />
          <SkeletonBox width="w-32" height="h-6" />
        </div>
        <SkeletonBox width="w-24" height="h-6" />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <SkeletonBox width="w-32" height="h-6" className="mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBox width="w-24" height="h-4" />
                <SkeletonBox width="w-full" height="h-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
          <SkeletonBox width="w-32" height="h-6" className="mb-5" />
          <SkeletonBox width="w-full" height="h-64" />
        </div>
      </div>

      {/* Table */}
      <div className="space-y-4">
        <SkeletonBox width="w-40" height="h-6" />
        <SkeletonTable rows={5} columns={5} />
      </div>
    </div>
  );
}

export default {
  Box: SkeletonBox,
  Text: SkeletonText,
  Card: SkeletonCard,
  Table: SkeletonTable,
  DropdownOptions: SkeletonDropdownOptions,
  FormDetailSkeleton: FormDetailSkeleton,
};