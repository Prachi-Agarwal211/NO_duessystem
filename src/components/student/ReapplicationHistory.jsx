'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ReapplicationHistory - Shows students their past reapplication attempts
 */
export default function ReapplicationHistory({ history = [], reapplicationCount = 0 }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);

    if (!history || history.length === 0 || reapplicationCount === 0) {
        return null;
    }

    return (
        <div className={`rounded-xl border transition-all duration-300 ${isDark
                ? 'bg-white/[0.02] border-white/10'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full p-4 flex items-center justify-between text-left transition-colors duration-200 rounded-xl ${isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                        }`}>
                        <Clock className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Reapplication History
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {reapplicationCount} previous attempt{reapplicationCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className={`p-4 pt-0 space-y-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'
                            }`}>
                            {/* Sort history by reapplication_number descending */}
                            {[...history]
                                .sort((a, b) => b.reapplication_number - a.reapplication_number)
                                .map((entry, index) => (
                                    <div
                                        key={entry.id || index}
                                        className={`p-4 rounded-lg ${isDark
                                                ? 'bg-white/5'
                                                : 'bg-gray-50'
                                            }`}
                                    >
                                        {/* Attempt Header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDark
                                                    ? 'bg-purple-500/20 text-purple-400'
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                Attempt #{entry.reapplication_number}
                                            </span>
                                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'Date unknown'}
                                            </span>
                                        </div>

                                        {/* Student Message */}
                                        {entry.student_message && (
                                            <div className={`mb-3 p-3 rounded-lg ${isDark
                                                    ? 'bg-blue-500/10 border border-blue-500/20'
                                                    : 'bg-blue-50 border border-blue-200'
                                                }`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageSquare className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                                    <span className={`text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        Your Response
                                                    </span>
                                                </div>
                                                <p className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    "{entry.student_message}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Rejected Departments at that time */}
                                        {entry.rejected_departments && entry.rejected_departments.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        Rejected By
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {entry.rejected_departments.map((dept, deptIdx) => (
                                                        <div
                                                            key={deptIdx}
                                                            className={`text-xs p-2 rounded ${isDark ? 'bg-red-500/10' : 'bg-red-50'
                                                                }`}
                                                        >
                                                            <span className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                                                {dept.department_name || dept.display_name}:
                                                            </span>
                                                            <span className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {dept.rejection_reason || 'No reason provided'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Edited Fields */}
                                        {entry.edited_fields && Object.keys(entry.edited_fields).length > 0 && (
                                            <div className="mt-3">
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Fields updated: {Object.keys(entry.edited_fields).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
