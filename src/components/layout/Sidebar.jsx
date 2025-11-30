'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  History, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';

export default function Sidebar({ isOpen, onClose, userType = 'admin' }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const navItems = userType === 'admin' ? [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Requests', href: '/admin/requests', icon: FileText },
    { name: 'History', href: '/admin/history', icon: History },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ] : [
    { name: 'Home', href: '/', icon: LayoutDashboard },
    { name: 'Check Status', href: '/student/check-status', icon: FileText },
    { name: 'Submit Form', href: '/student/submit-form', icon: FileText },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full z-50
        w-64 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r border-r-white/10
        ${isDark ? 'bg-black/90 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo Area */}
          <div className="h-20 flex items-center px-6 border-b border-white/10">
            <Logo size="small" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20' 
                      : isDark 
                        ? 'text-gray-400 hover:bg-white/5 hover:text-white' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                    }
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10">
            <button className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${isDark 
                ? 'text-gray-400 hover:bg-white/5 hover:text-red-400' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-red-600'
              }
            `}>
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
