'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/usePWA';

/**
 * OfflineBanner Component
 * Shows banner when user goes offline
 */
export default function OfflineBanner() {
  const { isOnline, effectiveType } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100]"
        >
          <div className="bg-warning-light dark:bg-warning-dark text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <WifiOff size={20} />
              <span className="font-medium">
                You're offline. Some features may be limited.
              </span>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Slow connection warning */}
      {isOnline && (effectiveType === 'slow-2g' || effectiveType === '2g') && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100]"
        >
          <div className="bg-warning-light dark:bg-warning-dark text-white px-4 py-2 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
              <Wifi size={16} />
              <span>Slow connection detected. Experience may be affected.</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}