'use client';

import { motion } from 'framer-motion';
import { Send, UserCheck, Award } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProcessPreview({ mode = 'horizontal' }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isVertical = mode === 'vertical';

    const steps = [
        { icon: Send, label: 'Submit App' },
        { icon: UserCheck, label: 'Dept Approvals' },
        { icon: Award, label: 'Certificate' }
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
                        className={`step-pill ${isDark ? 'step-pill-dark' : 'step-pill-light'} shrink-0`}
                    >
                        <step.icon size={15} className={isDark ? 'text-gray-400' : 'text-jecrc-red'} strokeWidth={isDark ? 2 : 2.5} />
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}> {/* Darker text for light mode */}
                            {step.label}
                        </span>

                        {/* Connector Arrow (except last item) */}
                        {i < steps.length - 1 && !isVertical && mode !== 'compact' && (
                            <span className={`ml-2 opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>→</span>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
