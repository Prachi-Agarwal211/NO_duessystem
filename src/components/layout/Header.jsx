'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Bell, Menu, Moon, Sun, User } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function Header({ onMenuClick, title = "Dashboard" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className={`
      h-20 px-6 lg:px-10
      flex items-center justify-between
      sticky top-0 z-30
      backdrop-blur-md border-b transition-colors duration-700
      ${isDark 
        ? 'bg-black/50 border-white/10' 
        : 'bg-white/70 border-gray-200'}
    `}>
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu size={24} className={isDark ? 'text-white' : 'text-black'} />
        </button>
        <h1 className={`text-xl font-bold font-serif hidden sm:block ${isDark ? 'text-white' : 'text-black'}`}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`
            p-2.5 rounded-full transition-all duration-300
            ${isDark 
              ? 'bg-white/10 hover:bg-white/20 text-yellow-400' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
          `}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button className={`
          p-2.5 rounded-full transition-all duration-300 relative
          ${isDark 
            ? 'bg-white/10 hover:bg-white/20 text-white' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
        `}>
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-jecrc-red rounded-full animate-pulse" />
        </button>

        {/* Profile */}
        <div className={`
          flex items-center gap-3 pl-4 border-l
          ${isDark ? 'border-white/10' : 'border-gray-200'}
        `}>
          <div className="hidden md:block text-right">
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>Admin User</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jecrc-red to-jecrc-red-dark flex items-center justify-center text-white font-bold shadow-lg shadow-jecrc-red/20">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
