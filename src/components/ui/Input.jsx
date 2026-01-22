'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';

export default function Input({
    label,
    name,
    type = 'text',
    value,
    onChange,
    required = false,
    error = '',
    placeholder = '',
    disabled = false,
    className,
    options = [], // For select
    rows = 4, // For textarea
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';

    // "Filled" design: Bottom border, light background (gray-50/white-5)
    // Shared container classes
    const containerClasses = cn(
        "relative w-full rounded-t-lg overflow-hidden transition-all duration-300",
        "bg-gray-50 dark:bg-white/5 border-b-2",
        isTextarea ? "min-h-[120px]" : "min-h-[56px]",
        error
            ? "border-red-500 bg-red-50/50 dark:bg-red-900/10"
            : "border-gray-200 dark:border-white/10 group-hover:bg-gray-100 dark:group-hover:bg-white/10 focus-within:border-jecrc-red dark:focus-within:border-jecrc-red",
        disabled && "opacity-60 cursor-not-allowed"
    );

    const inputBaseClasses = cn(
        "peer w-full px-4 pt-6 pb-2 bg-transparent outline-none border-none",
        "text-gray-900 dark:text-white placeholder-transparent",
        "text-base font-medium",
        disabled && "cursor-not-allowed",
        isSelect && "appearance-none cursor-pointer" // Hide default arrow for select
    );

    const labelClasses = cn(
        "absolute left-4 top-4 text-gray-500 dark:text-gray-400 text-base transition-all duration-200 pointer-events-none origin-[0]",
        "peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0",
        "peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-jecrc-red dark:peer-focus:text-jecrc-red",
        (value || value === 0) && "scale-75 -translate-y-3",
        error && "text-red-500 peer-focus:text-red-500"
    );

    return (
        <div className={cn("w-full group relative mb-5", className)}>
            <div className={containerClasses}>

                {/* Render Element based on type */}
                {isSelect ? (
                    <>
                        <select
                            name={name}
                            value={value}
                            onChange={onChange}
                            required={required}
                            disabled={disabled}
                            className={inputBaseClasses}
                            {...props}
                        >
                            <option value="" disabled className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                                {placeholder}
                            </option>
                            {options.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white py-2"
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {/* Custom Arrow */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 peer-focus:text-jecrc-red transition-colors">
                            <ChevronDown size={18} />
                        </div>
                    </>
                ) : isTextarea ? (
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        disabled={disabled}
                        placeholder=" "
                        rows={rows}
                        className={cn(inputBaseClasses, "resize-none")}
                        {...props}
                    />
                ) : (
                    <input
                        type={inputType}
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        disabled={disabled}
                        placeholder=" "
                        className={inputBaseClasses}
                        {...props}
                    />
                )}

                {/* Floating Label */}
                <label className={labelClasses}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>

                {/* Password Toggle */}
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        disabled={disabled}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-500 font-medium animate-in slide-in-from-top-1">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
