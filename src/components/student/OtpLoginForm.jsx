'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Lock, Loader2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function OtpLoginForm({ onLoginSuccess }) {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP
    const [loading, setLoading] = useState(false);
    const [registrationNo, setRegistrationNo] = useState('');
    const [otp, setOtp] = useState('');
    const [sentEmail, setSentEmail] = useState('');
    const [emailType, setEmailType] = useState('');

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!registrationNo.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationNo }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setSentEmail(data.email);
            setEmailType(data.emailType);
            toast.success(data.message || 'OTP sent successfully!');
            setStep(2);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/student/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationNo, otp }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Verification failed');

            toast.success('Login Successful!');

            // Trigger parent callback to reload or lift state
            if (onLoginSuccess) {
                onLoginSuccess(registrationNo);
            } else {
                // Fallback reload
                window.location.reload();
            }

        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-black/40 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-8 transform transition-all">

                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-jecrc-red to-jecrc-red-dark rounded-2xl flex items-center justify-center shadow-lg shadow-jecrc-red/20 mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                        <KeyRound className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Student Access
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {step === 1
                            ? 'Enter your registration number to verify your identity'
                            : `Enter the code sent to your ${emailType === 'personal' ? 'Personal' : 'Registered'} Email (${sentEmail})`
                        }
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleRequestOtp}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                    Registration Number
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-jecrc-red transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={registrationNo}
                                        onChange={(e) => setRegistrationNo(e.target.value.toUpperCase())}
                                        className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-jecrc-red/20 focus:border-jecrc-red transition-all"
                                        placeholder="e.g. 21BXXXXXX"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white bg-gradient-to-r from-jecrc-red to-jecrc-red-dark hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jecrc-red disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-jecrc-red/25"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleVerifyOtp}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                                    Enter 6-Digit OTP
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-jecrc-red transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-jecrc-red/20 focus:border-jecrc-red transition-all tracking-widest text-lg"
                                        placeholder="XXXXXX"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-600/25"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                Change Registration Number
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                        Please check your personal and college email for the OTP. If you don't receive it within 2 minutes, try again.
                    </p>
                </div>
            </div>
        </div>
    );
}
