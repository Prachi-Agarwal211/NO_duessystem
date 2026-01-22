'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Button({
    children,
    variant = 'primary', // primary, secondary, ghost, danger
    size = 'md', // sm, md, lg
    className,
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const variants = {
        primary: 'bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white hover:shadow-lg hover:shadow-jecrc-red/25 border border-transparent',
        secondary: 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20',
        ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-red-500/20',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            type={type}
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
}
