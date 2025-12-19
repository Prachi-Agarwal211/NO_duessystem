'use client';

export default function GlassCard({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
      relative overflow-hidden rounded-2xl border p-6
      bg-white border-gray-200 shadow-sm text-gray-900  /* ☀️ Light Mode: Solid White + Dark Text */
      dark:bg-white/5 dark:border-white/10 dark:text-white dark:backdrop-blur-xl dark:shadow-none /* 🌙 Dark Mode: Glass + White Text */
      transition-all duration-200
      ${className}
    `}>
      {children}
    </div>
  );
}