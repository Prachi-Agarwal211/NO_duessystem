'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CustomCursor from '@/components/landing/CustomCursor';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardLayout({ children, userType = 'admin' }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const currentTheme = theme || 'dark';

  return (
    <AuroraBackground>
      <CustomCursor theme={currentTheme} />
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          userType={userType}
        />
        
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuroraBackground>
  );
}
