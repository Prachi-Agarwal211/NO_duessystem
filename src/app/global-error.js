"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Global Error Boundary
 * Catches all unhandled errors in the application
 */
export default function GlobalError({ error, reset }) {
    useEffect(() => {
        // Log error to console
        console.error("Global Error:", error);
    }, [error]);

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = "/";
    };

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-lg w-full"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                    <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
                                </div>
                            </motion.div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-center mb-3 text-gray-900 dark:text-white">
                                Oops! Something Went Wrong
                            </h1>

                            {/* Description */}
                            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                                We encountered a critical error. Don't worry, your data is safe.
                                Please try again or contact support if the problem persists.
                            </p>

                            {/* Error Message in Dev */}
                            {process.env.NODE_ENV === "development" && error?.message && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                                        {error.message}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleReload}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-lg font-semibold transition-colors"
                                >
                                    <RefreshCw size={18} />
                                    Reload Page
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGoHome}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                                >
                                    <Home size={18} />
                                    Go to Home
                                </motion.button>
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                            If this problem persists, please contact support
                        </p>
                    </motion.div>
                </div>
            </body>
        </html>
    );
}
