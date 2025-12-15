'use client';

/**
 * GridBackground Component
 * Optimized replacement for heavy aurora animations
 * Uses static grid pattern with subtle animations
 */
export default function GridBackground() {
  return (
    <div className="fixed inset-0 z-[-1] h-full w-full overflow-hidden">
      {/* Base gradient - light mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-white dark:from-deep-black dark:via-ink-black dark:to-deep-black" />
      
      {/* Radial gradient for focus effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-100/50 via-transparent to-transparent dark:from-jecrc-red/5 dark:via-transparent dark:to-transparent opacity-90" />
      
      {/* Grid Pattern - SVG for crisp lines */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern 
            id="grid" 
            width="40" 
            height="40" 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d="M 40 0 L 0 0 0 40" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1"
              className="text-black dark:text-white"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      
      {/* Animated subtle beam - only on desktop for performance */}
      <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-jecrc-red/10 via-jecrc-red/5 to-transparent blur-3xl opacity-40 dark:opacity-20 animate-pulse-slow" />
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-deep-black to-transparent" />
    </div>
  );
}