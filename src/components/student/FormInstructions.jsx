'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function FormInstructions() {
    const [isOpen, setIsOpen] = useState(true);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className={`mb-8 rounded-2xl overflow-hidden border transition-all duration-300 ${isDark
                ? 'bg-blue-900/10 border-blue-500/20 hover:border-blue-500/30'
                : 'bg-blue-50 border-blue-100 hover:border-blue-200 shadow-sm'
            }`}>
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`font-bold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                            Important Instructions
                        </h3>
                        <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                            Please read carefully before applying
                        </p>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                ) : (
                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                )}
            </button>

            {/* Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className={`px-4 pb-6 pt-0 border-t ${isDark ? 'border-blue-500/10' : 'border-blue-100'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

                                {/* Prerequisites */}
                                <div className="space-y-3">
                                    <h4 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        Prerequisites
                                    </h4>
                                    <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            <span>Use your <strong>Official College Email</strong> (e.g., name.branch21@jecrcu.edu.in).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            <span>Have your <strong>Registration Number</strong> handy.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                            <span><strong>Alumni Portal Screenshot:</strong> You must register on the alumni portal and upload a valid screenshot.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Workflow */}
                                <div className="space-y-3">
                                    <h4 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <FileText className="w-4 h-4 text-purple-500" />
                                        Process Overview
                                    </h4>
                                    <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                            <span>Approvals happen <strong>Department-wise</strong> (Library, Hostel, IT, etc.).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                            <span>You can check status or <strong>Reapply</strong> to specific departments if rejected.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                                            <span>Certificate is auto-generated upon 100% clearance.</span>
                                        </li>
                                    </ul>
                                </div>

                            </div>

                            {/* Warning */}
                            <div className={`mt-5 p-3 rounded-lg flex items-start gap-3 ${isDark ? 'bg-orange-900/20 border border-orange-500/20' : 'bg-orange-50 border border-orange-100'}`}>
                                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <p className={`text-xs leading-relaxed ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>
                                    <strong>Note:</strong> Providing false information will result in immediate rejection. Ensure all details match your university records.
                                </p>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
