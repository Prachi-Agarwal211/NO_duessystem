'use client';

export default function GlassCard({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
      relative overflow-hidden rounded-2xl border
      bg-white border-gray-200 shadow-sm  /* ☀️ Light Mode: Solid White */
      dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-xl dark:shadow-none /* 🌙 Dark Mode: Glass */
      transition-all duration-200
      ${className}
    `}>
      {children}
    </div>
  );
}