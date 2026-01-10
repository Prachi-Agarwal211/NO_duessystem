'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shield, CheckCircle, XCircle, AlertTriangle, Download, FileText, Calendar, Hash, Fingerprint, Clock } from 'lucide-react';

export default function PublicVerifyPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    if (params.id) {
      verifyCertificate(params.id);
    }
  }, [params.id]);

  const verifyCertificate = async (formId) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch certificate data from database
      const response = await fetch(`/api/certificate/verify?formId=${formId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Certificate not found');
      }

      // If we have certificate data, it's valid
      if (data.success) {
        setVerificationResult({
          valid: true,
          message: 'Certificate is authentic and verified'
        });
        // Mock certificate data structure - adjust based on actual API response
        setCertificate({
          studentName: data.certificate?.student_name || 'N/A',
          registrationNo: data.certificate?.registration_no || 'N/A',
          course: 'Not Available', // Add to API if needed
          branch: 'Not Available',
          issueDate: data.certificate?.updated_at || new Date().toISOString(),
          transactionId: data.certificate?.blockchain_tx || 'N/A',
          certificateUrl: null,
          verificationCount: data.totalVerifications || 0,
          departmentStatuses: data.departmentStatuses || [] // Store fetched statuses
        });
      } else {
        setVerificationResult({
          valid: false,
          message: data.message || 'Certificate could not be verified'
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify certificate');
      setVerificationResult({
        valid: false,
        message: 'Certificate not found or invalid'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                JECRC University
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Certificate Verification System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Verifying certificate...
              </p>
            </div>
          </div>
        ) : verificationResult ? (
          <div className="space-y-6">
            {/* Verification Status Card */}
            <div
              className={`rounded-xl shadow-lg p-8 ${verificationResult.valid
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                }`}
            >
              <div className="flex items-start gap-4">
                {verificationResult.valid ? (
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-600 dark:text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h2
                    className={`text-2xl font-bold mb-2 ${verificationResult.valid
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                      }`}
                  >
                    {verificationResult.valid
                      ? '✓ Certificate Verified'
                      : '✗ Verification Failed'}
                  </h2>
                  <p
                    className={`text-lg ${verificationResult.valid
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                      }`}
                  >
                    {verificationResult.message}
                  </p>
                  {verificationResult.valid && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                      <Shield className="w-4 h-4" />
                      <span>This certificate is blockchain-secured and has not been tampered with</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            {certificate && verificationResult.valid && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-red-600" />
                  Certificate Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Name */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Student Name</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {certificate.studentName}
                    </p>
                  </div>

                  {/* Registration Number */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Registration Number</p>
                    <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">
                      {certificate.registrationNo}
                    </p>
                  </div>

                  {/* Issue Date */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Issue Date
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {new Date(certificate.issueDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Verification Count */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Times Verified
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {certificate.verificationCount} times
                    </p>
                  </div>
                </div>

                {/* ✅ Department Clearance Breakdown */}
                {certificate.departmentStatuses && certificate.departmentStatuses.length > 0 && (
                  <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Departmental Clearance Status
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {certificate.departmentStatuses.map((dept, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                          <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                            {dept.department_name ? dept.department_name.replace(/_/g, ' ') : 'Department'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${dept.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                            {dept.status === 'approved' ? 'CLEARED' : dept.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blockchain Info */}
                {certificate.transactionId && certificate.transactionId !== 'N/A' && (
                  <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" />
                      Blockchain Verification
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Transaction ID</p>
                        <p className="font-mono text-xs text-blue-900 dark:text-blue-100 break-all bg-white dark:bg-slate-800 p-2 rounded">
                          {certificate.transactionId}
                        </p>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                        This certificate is secured using blockchain-style cryptographic hashing to prevent tampering or forgery.
                      </p>
                    </div>
                  </div>
                )}

                {/* Download Button */}
                {certificate.certificateUrl && (
                  <div className="mt-6">
                    <a
                      href={certificate.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download Certificate
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Error Details */}
            {!verificationResult.valid && error && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      Verification Details
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Information Banner */}
            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl p-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                About Certificate Verification
              </h4>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>All JECRC University No Dues Certificates are digitally signed and blockchain-secured</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>Each certificate has a unique QR code for instant verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>Any tampering with certificate data will be detected during verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>For assistance, contact the Registration Office at JECRC University</span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} JECRC University. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Certificate Verification System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}