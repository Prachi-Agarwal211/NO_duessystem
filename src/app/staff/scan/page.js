'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
    Camera,
    ArrowLeft,
    FileSearch,
    AlertCircle,
    CheckCircle2,
    X,
    Maximize2,
    Scan
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { useSafeTheme } from '@/hooks/useSafeTheme';

export default function ScanPage() {
    const router = useRouter();
    const { theme } = useSafeTheme();
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [isScannerReady, setIsScannerReady] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Initialize scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        const scanner = new Html5QrcodeScanner("reader", config, /* verbose= */ false);

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
        setIsScannerReady(true);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Scanner cleanup error", err));
            }
        };
    }, []);

    const onScanSuccess = (decodedText) => {
        console.log(`Scan Result: ${decodedText}`);

        // Try to extract UUID or URL
        // Format 1: Full URL (https://.../verify/UUID)
        // Format 2: Just UUID
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = decodedText.match(uuidRegex);

        if (match) {
            const formId = match[0];
            setScanResult({
                type: 'success',
                text: 'Valid QR Code Detected!',
                id: formId
            });

            // Beep or haptic feedback could go here

            // Redirect after a short delay to show success state
            setTimeout(() => {
                router.push(`/staff/student/${formId}`);
            }, 1000);
        } else {
            setError("Invalid QR Code. Please scan a valid JECRC Certificate QR.");
            setTimeout(() => setError(null), 3000);
        }
    };

    const onScanFailure = (err) => {
        // Failure is frequent as it checks every frame, so we don't show it unless critical
        // console.log(`Scan error: ${err}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-jecrc-red/10 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="text-center flex-1 pr-10">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-2">
                            <Scan className="w-6 h-6 text-jecrc-red" />
                            Scan & Verify
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Scan student certificate or form QR code
                        </p>
                    </div>
                </div>

                {/* Scanner Card */}
                <GlassCard className="overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 relative">
                    {!scanResult ? (
                        <div className="p-4 sm:p-8">
                            <div id="reader" className="w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800"></div>

                            {!isScannerReady && (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Camera className="w-12 h-12 text-gray-400 animate-pulse" />
                                    <p className="text-gray-500">Initializing Camera...</p>
                                </div>
                            )}

                            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <Maximize2 className="w-4 h-4" />
                                Place the QR code inside the frame
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">Detected Successfully</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Redirecting to student details...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Toast Overlay */}
                    {error && (
                        <div className="absolute top-4 left-4 right-4 animate-in slide-in-from-top duration-300">
                            <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="flex-1 text-sm font-medium">{error}</span>
                                <button onClick={() => setError(null)}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Tips / Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Verification</p>
                            <p className="text-xs text-blue-700 dark:text-blue-400">Instantly check authenticity of certificates.</p>
                        </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl flex gap-3">
                        <FileSearch className="w-5 h-5 text-orange-500 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">Fast Access</p>
                            <p className="text-xs text-orange-700 dark:text-orange-400">No need to search by Registration Number.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
