'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Shield, CheckCircle, XCircle, AlertTriangle, Camera, History, FileText } from 'lucide-react';

export default function StaffVerifyPage() {
  const [scanning, setScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let scanner = null;

    if (scanning) {
      scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      });

      scanner.render(onScanSuccess, onScanError);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanning]);

  const onScanSuccess = async (decodedText) => {
    setLoading(true);
    setError(null);

    try {
      // Call verification API
      const response = await fetch('/api/certificate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: decodedText })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setVerificationResult({
          status: 'valid',
          data: data
        });
        
        // Add to history
        setHistory(prev => [{
          timestamp: new Date().toISOString(),
          result: 'VALID',
          studentName: data.certificate.studentName,
          registrationNo: data.certificate.registrationNo
        }, ...prev.slice(0, 9)]);
      } else {
        setVerificationResult({
          status: 'invalid',
          data: data
        });
        
        // Add to history
        setHistory(prev => [{
          timestamp: new Date().toISOString(),
          result: 'INVALID',
          error: data.error || data.message
        }, ...prev.slice(0, 9)]);
      }

      // Stop scanning after successful scan
      setScanning(false);
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onScanError = (err) => {
    // Ignore scanning errors (they're frequent and expected)
    if (!err.includes('NotFoundException')) {
      console.warn('QR scan error:', err);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setVerificationResult(null);
    setError(null);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-500" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Certificate Verification
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Scan QR code on certificates to verify authenticity using blockchain technology
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  QR Code Scanner
                </h2>
                {!scanning && !verificationResult && (
                  <button
                    onClick={startScanning}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Start Scanning
                  </button>
                )}
                {scanning && (
                  <button
                    onClick={stopScanning}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Stop Scanning
                  </button>
                )}
              </div>

              {/* QR Reader */}
              {scanning && (
                <div className="mb-6">
                  <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                  {loading && (
                    <div className="mt-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                      <p className="mt-2 text-slate-600 dark:text-slate-400">Verifying certificate...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Verification Result */}
              {verificationResult && (
                <div className="space-y-4">
                  {verificationResult.status === 'valid' ? (
                    <div className="border-2 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
                        <div>
                          <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
                            Certificate Verified ✓
                          </h3>
                          <p className="text-green-700 dark:text-green-300 text-sm">
                            This certificate is authentic and has not been tampered with
                          </p>
                        </div>
                      </div>

                      {/* Certificate Details */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Certificate Details
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Student Name</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {verificationResult.data.certificate.studentName}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Registration No</p>
                            <p className="font-mono font-semibold text-slate-900 dark:text-white">
                              {verificationResult.data.certificate.registrationNo}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Course</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {verificationResult.data.certificate.course}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Branch</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {verificationResult.data.certificate.branch}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Session</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {verificationResult.data.certificate.sessionFrom} - {verificationResult.data.certificate.sessionTo}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Issue Date</p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {new Date(verificationResult.data.certificate.issueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Blockchain Info */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <h5 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                            Blockchain Verification
                          </h5>
                          <div className="space-y-2 text-xs">
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Transaction ID</p>
                              <p className="font-mono text-slate-900 dark:text-white break-all">
                                {verificationResult.data.blockchain.transactionId}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Block Number</p>
                              <p className="font-mono text-slate-900 dark:text-white">
                                #{verificationResult.data.blockchain.blockNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Times Verified</p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {verificationResult.data.certificate.verificationCount} times
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <XCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
                        <div>
                          <h3 className="text-xl font-bold text-red-900 dark:text-red-100">
                            Verification Failed
                          </h3>
                          <p className="text-red-700 dark:text-red-300 text-sm">
                            {verificationResult.data.message || 'This certificate could not be verified'}
                          </p>
                        </div>
                      </div>

                      {verificationResult.data.tamperedFields && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              Tampered Fields Detected
                            </h4>
                          </div>
                          <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                            {verificationResult.data.tamperedFields.map((field, idx) => (
                              <li key={idx}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={resetVerification}
                    className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Scan Another Certificate
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Instructions */}
              {!scanning && !verificationResult && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                    How to Verify
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 text-sm">
                    <li>Click "Start Scanning" to activate the camera</li>
                    <li>Point your camera at the QR code on the certificate</li>
                    <li>Wait for automatic detection and verification</li>
                    <li>View the complete verification results</li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200 text-xs">
                      <strong>Note:</strong> This system uses blockchain technology to ensure certificates cannot be tampered with or forged.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <History className="w-5 h-5" />
                Recent Verifications
              </h2>
              
              {history.length === 0 ? (
                <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-8">
                  No verifications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        item.result === 'VALID'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {item.result === 'VALID' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-xs font-semibold ${
                          item.result === 'VALID'
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {item.result}
                        </span>
                      </div>
                      {item.studentName && (
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.studentName}
                        </p>
                      )}
                      {item.registrationNo && (
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          {item.registrationNo}
                        </p>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {item.error}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}