"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Staff Dashboard Error Boundary
 * Catches errors in the dashboard and provides graceful recovery options
 */
export default function DashboardError({ error, reset }) {
    const router = useRouter();

    useEffect(() => {
        // Log error to console in development
        console.error("Dashboard Error:", error);
    }, [error]);

    const handleGoBack = () => {
        router.back();
    };

    const handleGoHome = () => {
        router.push("/");
    };

    const handleRetry = () => {
        // Clear any cached data and retry
        if (typeof window !== "undefined") {
            // Clear dashboard-specific cache
            localStorage.removeItem("dashboard_filters");
            localStorage.removeItem("dashboard_search");
        }
        reset();
    };

    // Determine error type for better messaging
    const getErrorMessage = () => {
        const errorMsg = error?.message || "";

        if (errorMsg.includes("timeout") || errorMsg.includes("took too long")) {
            return {
                title: "Request Timeout",
                description: "The server took too long to respond. This might be due to high traffic or a slow connection.",
                icon: "⏱️"
            };
        }

        if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
            return {
                title: "Connection Error",
                description: "Unable to connect to the server. Please check your internet connection.",
                icon: "📡"
            };
        }

        if (errorMsg.includes("auth") || errorMsg.includes("session") || errorMsg.includes("unauthorized")) {
            return {
                title: "Session Expired",
                description: "Your session has expired. Please log in again to continue.",
                icon: "🔒"
            };
        }

        if (errorMsg.includes("database") || errorMsg.includes("query")) {
            return {
                title: "Database Error",
                description: "There was a problem loading your data. Please try again in a moment.",
                icon: "🗄️"
            };
        }

        return {
            title: "Something Went Wrong",
            description: "We encountered an unexpected error while loading the dashboard. Don't worry, your data is safe.",
            icon: "⚠️"
        };
    };

    const errorInfo = getErrorMessage();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-lg w-full"
            >
                {/* Error Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="flex justify-center mb-6"
                    >
                        <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-5xl">
                            {errorInfo.icon}
                        </div>
                    </motion.div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center mb-3 text-gray-900 dark:text-white">
                        {errorInfo.title}
                    </h1>

                    {/* Description */}
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                        {errorInfo.description}
                    </p>

                    {/* Error Details (Development Only) */}
                    {process.env.NODE_ENV === "development" && error?.message && (
                        <details className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Error Details (Dev Mode)
                            </summary>
                            <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40 mt-2">
                                {error.message}
                                {error.stack}
                            </pre>
                        </details>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleRetry}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-lg font-semibold transition-colors duration-200"
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </motion.button>

                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGoBack}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors duration-200"
                            >
                                <ArrowLeft size={18} />
                                Go Back
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors duration-200"
                            >
                                <Home size={18} />
                                Home
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    If this problem persists, please contact{" "}
                    <a href="/support" className="text-jecrc-red hover:underline">
                        support
                    </a>
                </p>
            </motion.div>
        </div>
    );
}
