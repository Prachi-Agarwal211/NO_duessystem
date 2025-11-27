'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function SearchBar({ value, onChange, placeholder }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search..."}
        className={`w-full px-4 py-3 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-jecrc-red transition-all duration-700 ${
          isDark
            ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400'
            : 'bg-white border border-gray-300 text-ink-black placeholder-gray-500'
        }`}
      />
      <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-700 ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}