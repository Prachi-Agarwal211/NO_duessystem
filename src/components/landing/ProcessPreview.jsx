'use client';

import { motion } from 'framer-motion';
import { Send, UserCheck, Award } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProcessPreview({ mode = 'horizontal' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isVertical = mode === 'vertical';

    const steps = [
        { icon: Send, label: 'Submit App', color: 'from-blue-500 to-cyan-500' },
        { icon: UserCheck, label: 'Dept Approvals', color: 'from-amber-500 to-orange-500' },
        { icon: Award, label: 'Certificate', color: 'from-green-500 to-emerald-500' }
    ];

    // "Horizontal" mode (Horizontal Pills) - Used for both Desktop and Mobile now
    return (
        <div className={`w-full max-w-lg ${isVertical ? '' : ''}`}>
            {/* Mobile: Scrollable, Desktop: Wrapped/Centered */}
            <div className={`
                flex 
                ${mode === 'compact' ? 'overflow-x-auto pb-4 px-2 justify-center no-scrollbar mask-gradient-x' : 'flex-wrap justify-center items-center'} 
                gap-3 relative
                w-full
            `}>

                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + (i * 0.1), duration: 0.5 }}
                        className={`
                            step-pill shrink-0
                            px-4 py-2 rounded-full
                            flex items-center gap-2
                            ${isDark 
                                ? 'bg-white/5 border border-white/10' 
                                : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 shadow-sm'
                            }
                        `}
                    >
                        <div className={`
                            p-1.5 rounded-lg
                            bg-gradient-to-br ${step.color}
                            opacity-80
                        `}>
                            <step.icon size={14} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className={`
                            text-xs sm:text-sm font-semibold tracking-wide
                            ${isDark ? 'text-gray-300' : 'text-gray-700'}
                        `}>
                            {step.label}
                        </span>

                        {/* Connector Arrow (except last item) */}
                        {i < steps.length - 1 && !isVertical && mode !== 'compact' && (
                            <span className={`
                                ml-2 text-lg
                                ${isDark ? 'text-white/20' : 'text-gray-300'}
                            `}>
                                →
                            </span>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
