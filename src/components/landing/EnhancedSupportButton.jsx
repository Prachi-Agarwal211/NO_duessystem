'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import StudentSupportModal from '@/components/support/StudentSupportModal';
import DepartmentSupportModal from '@/components/support/DepartmentSupportModal';

/**
 * Enhanced Floating Support Button with Liquid Effects
 * - Orbital floating animation
 * - Liquid glow on hover
 * - Magnetic hover effect (follows cursor slightly)
 * - Pulsing ring animation
 * - URL-based modal detection (no auth required)
 */
export default function EnhancedSupportButton() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showModal, setShowModal] = useState(false);
  const [deviceTier, setDeviceTier] = useState('high');

  useEffect(() => {
    const detectDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isVeryLowEnd = (navigator.deviceMemory && navigator.deviceMemory < 2) ||
        (navigator.connection && navigator.connection.saveData);
      const isLowEnd = isMobile || (navigator.deviceMemory && navigator.deviceMemory < 4);

      if (isVeryLowEnd) {
        setDeviceTier('very-low');
      } else if (isLowEnd) {
        setDeviceTier('low');
      } else {
        setDeviceTier('high');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // Determine which modal to show based on current URL path
  const renderModal = () => {
    // Hide on admin pages (admins don't need support button)
    if (pathname.startsWith('/admin')) {
      return null;
    }

    // Show department support on staff pages
    if (pathname.startsWith('/staff')) {
      return <DepartmentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
    }

    // Default: Show student support for all other pages (student pages, public pages, etc.)
    return <StudentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
  };

  // Don't render button at all on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className={`
          fixed bottom-8 right-8 w-12 h-12 rounded-full 
          flex items-center justify-center z-40 group transition-all duration-300
          ${isDark
            ? 'bg-white/5 hover:bg-white/10 border border-white/10'
            : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-lg'
          }
          backdrop-blur-md overflow-hidden
        `}
        style={{
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 15px rgba(0,0,0,0.05)'
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Need Support?"
        aria-label="Open support"
      >
        {/* Subtle Ping Animation */}
        <span className="absolute inline-flex h-full w-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-jecrc-red/5"></span>

        <Headphones
          className={`w-5 h-5 transition-colors duration-300 ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-jecrc-red'}`}
          strokeWidth={2}
        />
      </motion.button>



      {renderModal()}
    </>
  );
}