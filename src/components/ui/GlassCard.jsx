import React from 'react';

export default function GlassCard({ children, className = "", ...props }) {
  return (
    <div 
      className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}