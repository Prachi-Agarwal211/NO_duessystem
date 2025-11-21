'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * JECRC University Logo Component
 * Reusable logo component with multiple size variants and theme support
 */
export default function Logo({
    size = 'medium',
    className = '',
    showText = true,
    priority = false
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Size configurations
    const sizeConfig = {
        small: { width: 40, height: 40, textClass: 'text-sm' },
        medium: { width: 60, height: 60, textClass: 'text-base' },
        large: { width: 80, height: 80, textClass: 'text-lg' },
        xlarge: { width: 120, height: 120, textClass: 'text-xl' }
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative flex-shrink-0">
                <Image
                    src="/assets/jecrc-logo.jpg"
                    alt="JECRC University"
                    width={config.width}
                    height={config.height}
                    className="rounded-lg shadow-md"
                    priority={priority}
                />
            </div>
            {showText && (
                <div className="flex flex-col">
                    <h1 className={`font-bold ${config.textClass} transition-colors duration-700 ${isDark ? 'text-white' : 'text-ink-black'
                        }`}>
                        JECRC University
                    </h1>
                    <p className={`text-xs transition-colors duration-700 ${isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        No Dues System
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Logo Icon Only - For compact spaces like mobile headers
 */
export function LogoIcon({ size = 40, className = '' }) {
    return (
        <div className={`relative flex-shrink-0 ${className}`}>
            <Image
                src="/assets/jecrc-logo.jpg"
                alt="JECRC"
                width={size}
                height={size}
                className="rounded-lg shadow-md"
                priority
            />
        </div>
    );
}