'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

export default function TrustSignals({ mode = 'horizontal' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isCompact = mode === 'compact';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className={`flex flex-wrap ${isCompact ? 'flex-col items-start gap-2' : 'justify-center gap-x-4 gap-y-2 md:gap-8'} 
              mt-4 text-[10px] sm:text-xs font-medium tracking-wide opacity-50 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
            <span className="flex items-center gap-2">
                <span className="text-emerald-500">✔</span> Digitally verified
            </span>
            <span className="flex items-center gap-2">
                <span className="text-emerald-500">✔</span> No physical visits
            </span>
            <span className="flex items-center gap-2">
                <span className="text-emerald-500">✔</span> Official record
            </span>
        </motion.div>
    );
}
