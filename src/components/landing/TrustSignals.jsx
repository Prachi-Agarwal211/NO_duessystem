'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Shield, Zap, Award } from 'lucide-react';

export default function TrustSignals({ mode = 'horizontal' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isCompact = mode === 'compact';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className={`
                flex flex-wrap ${isCompact ? 'flex-col items-start gap-2' : 'justify-center gap-x-4 gap-y-2 md:gap-8'} 
                mt-4 text-[10px] sm:text-xs font-semibold tracking-wide
                ${isDark ? 'text-gray-500' : 'text-gray-400'}
            `}
        >
            <span className={`
                flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full
                ${isDark ? 'bg-white/5' : 'bg-gray-100'}
            `}>
                <Shield className={`w-3 h-3 sm:w-4 sm:h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Digitally Verified</span>
            </span>
            <span className={`
                flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full
                ${isDark ? 'bg-white/5' : 'bg-gray-100'}
            `}>
                <Zap className={`w-3 h-3 sm:w-4 sm:h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>No Physical Visits</span>
            </span>
            <span className={`
                flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full
                ${isDark ? 'bg-white/5' : 'bg-gray-100'}
            `}>
                <Award className={`w-3 h-3 sm:w-4 sm:h-4 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Official Record</span>
            </span>
        </motion.div>
    );
}
