"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, ArrowLeft, UserX } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Student Detail Page Error Boundary
 * Handles errors when viewing individual student details
 */
export default function StudentDetailError({ error, reset }) {
    const router = useRouter();

    useEffect(() => {
        console.error("Student Detail Error:", error);
    }, [error]);

    const handleGoBack = () => {
        router.push("/staff/dashboard");
    };

    const handleRetry = () => {
        reset();
    };

    // Determine error type
    const getErrorInfo = () => {
        const errorMsg = error?.message || "";

        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
            return {
                title: "Student Not Found",
                description: "The student record you're looking for doesn't exist or has been removed.",
                icon: <UserX className="w-10 h-10 text-red-600 dark:text-red-400" />,
                showRetry: false
            };
        }

        if (errorMsg.includes("auth") || errorMsg.includes("session")) {
            return {
                title: "Session Expired",
                description: "Your session has expired. Please log in again to continue.",
                icon: <AlertTriangle className="w-10 h-10 text-orange-600 dark:text-orange-400" />,
                showRetry: false
            };
        }

        return {
            title: "Error Loading Student Data",
            description: "We couldn't load the student details. This might be a temporary issue.",
            icon: <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />,
            showRetry: true
        };
    };

    const errorInfo = getErrorInfo();

    return (
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
                        {errorInfo.showRetry && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleRetry}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-lg font-semibold transition-colors"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </motion.button>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGoBack}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                        >
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
