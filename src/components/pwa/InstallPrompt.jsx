'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import usePWA from '@/hooks/usePWA';

/**
 * InstallPrompt Component
 * Shows banner prompting user to install PWA
 */
export default function InstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installPWA();
    
    if (success) {
      localStorage.setItem('pwa-installed', 'true');
    }
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
      >
        <div className="glass rounded-xl p-4 shadow-2xl border border-jecrc-red/20 dark:border-jecrc-red-bright/20">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} className="text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-jecrc-red to-jecrc-red-dark">
              <Download size={24} className="text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-black dark:text-white mb-1">
                Install JECRC No Dues
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Install our app for faster access and offline support
              </p>

              {/* Action button */}
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full px-4 py-2 bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {isInstalling ? 'Installing...' : 'Install App'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}