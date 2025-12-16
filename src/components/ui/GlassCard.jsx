'use client';

/**
 * GlassCard Component
 * Modern glassmorphism card with blur effect
 * Supports both light and dark themes
 */

export default function GlassCard({ children, className = "" }) {
  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}