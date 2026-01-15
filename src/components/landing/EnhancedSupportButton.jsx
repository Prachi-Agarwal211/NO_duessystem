'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import StudentSupportModal from '@/components/support/StudentSupportModal';
import DepartmentSupportModal from '@/components/support/DepartmentSupportModal';

/**
 * Enhanced Floating Support Button
 * - Gradient background with subtle glow
 * - Expands on hover to show "Support" text
 * - Subtle floating animation
 */
export default function EnhancedSupportButton() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const renderModal = () => {
    if (pathname.startsWith('/admin')) return null;
    if (pathname.startsWith('/staff')) {
      return <DepartmentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
    }
    return <StudentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
  };

  if (pathname.startsWith('/admin')) return null;

  // Hide on chat pages to prevent overlap with send button
  if (pathname.includes('/chat/')) return null;

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed bottom-8 right-8 h-12 rounded-full
          flex items-center z-40 group
          border backdrop-blur-md overflow-hidden
          ${isDark
            ? 'bg-gradient-to-br from-gray-800/80 via-gray-900/90 to-black/80 border-white/20 hover:border-jecrc-red/50'
            : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200 hover:border-jecrc-red/50 shadow-lg'
          }
        `}
        style={{
          boxShadow: isDark
            ? isHovered
              ? '0 8px 32px rgba(196, 30, 58, 0.3), 0 0 20px rgba(196, 30, 58, 0.15)'
              : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            : isHovered
              ? '0 8px 32px rgba(196, 30, 58, 0.2), 0 0 20px rgba(196, 30, 58, 0.1)'
              : '0 4px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
          width: isHovered ? '130px' : '48px',
          paddingLeft: isHovered ? '16px' : '12px',
          paddingRight: isHovered ? '16px' : '12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        initial={{ scale: 0, y: 20 }}
        animate={{
          scale: 1,
          y: [0, -4, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 260, damping: 20 },
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
        whileTap={{ scale: 0.95 }}
        title="Need Support?"
        aria-label="Open support"
      >
        {/* Shimmer effect on hover */}
        <div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, transparent 0%, rgba(196, 30, 58, 0.1) 50%, transparent 100%)'
              : 'linear-gradient(135deg, transparent 0%, rgba(196, 30, 58, 0.05) 50%, transparent 100%)',
          }}
        />

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-50"
          style={{ borderColor: 'rgba(196, 30, 58, 0.5)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />

        <div className="flex items-center gap-2 relative z-10">
          <Headphones
            className={`w-5 h-5 flex-shrink-0 transition-colors duration-300 ${isDark
              ? 'text-gray-300 group-hover:text-jecrc-red'
              : 'text-gray-600 group-hover:text-jecrc-red'
              }`}
            strokeWidth={2}
          />
          <span
            className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isDark ? 'text-white' : 'text-gray-700'
              }`}
            style={{
              opacity: isHovered ? 1 : 0,
              width: isHovered ? 'auto' : 0,
              overflow: 'hidden'
            }}
          >
            Support
          </span>
        </div>
      </motion.button>
      {renderModal()}
    </>
  );
}