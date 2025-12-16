'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * BottomSheet - Mobile-optimized drawer component
 * 
 * Features:
 * - Slides up from bottom on mobile devices
 * - Swipe-to-dismiss gesture support
 * - Backdrop blur with dark overlay
 * - Handle indicator for visual affordance
 * - Better thumb-zone accessibility than modals
 * - Smooth spring animations
 * 
 * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Callback when closed
 * @param {React.ReactNode} children - Sheet content
 * @param {string} title - Optional header title
 * @param {boolean} isDark - Theme mode
 */
export default function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title = "",
  isDark = true 
}) {
  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className={`fixed inset-0 z-[100] backdrop-blur-sm
              ${isDark ? 'bg-black/60' : 'bg-black/40'}`}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, { offset, velocity }) => {
              // Close if dragged down significantly or with high velocity
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
            className={`fixed bottom-0 left-0 right-0 z-[101] 
              rounded-t-3xl shadow-2xl
              max-h-[90vh] overflow-hidden
              ${isDark 
                ? 'bg-[#0A0A0A] border-t border-white/10' 
                : 'bg-white border-t border-black/10'
              }`}
          >
            {/* Drag Handle */}
            <div className="sticky top-0 z-10 flex justify-center pt-4 pb-2">
              <div className={`h-1.5 w-12 rounded-full transition-colors duration-300
                ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} 
              />
            </div>

            {/* Header (if title provided) */}
            {title && (
              <div className={`sticky top-8 z-10 flex items-center justify-between px-6 py-4 border-b
                ${isDark 
                  ? 'bg-[#0A0A0A]/95 backdrop-blur-md border-white/10' 
                  : 'bg-white/95 backdrop-blur-md border-black/10'
                }`}>
                <h3 className={`text-xl font-semibold font-serif
                  ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-full transition-colors duration-300
                    ${isDark 
                      ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                      : 'hover:bg-black/5 text-gray-600 hover:text-black'
                    }`}
                >
                  <X size={24} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}