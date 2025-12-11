'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, FileCheck, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';

export default function ManualEntryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    registration_no: '',
    school: '',
    course: '',
    branch: ''
  });

  const [schools, setSchools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch schools on mount
  useEffect(() => {
    async function fetchSchools() {
      try {
        const { data } = await supabase
          .from('config_schools')
          .select('*')
          .eq('is_active', true)
          .order('display_order');
        setSchools(data || []);
      } catch (err) {
        console.error('Error fetching schools:', err);
      }
    }
    fetchSchools();
  }, []);

  // Fetch courses when school changes
  const handleSchoolChange = async (schoolId, schoolName) => {
    setSelectedSchoolId(schoolId);
    setSelectedCourseId('');
    setSelectedBranchId('');
    setCourses([]);
    setBranches([]);
    
    setFormData(prev => ({
      ...prev,
      school: schoolName,
      course: '',
      branch: ''
    }));

    if (schoolId) {
      const { data } = await supabase
        .from('config_courses')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('display_order');
      setCourses(data || []);
    }
  };

  // Fetch branches when course changes
  const handleCourseChange = async (courseId, courseName) => {
    setSelectedCourseId(courseId);
    setSelectedBranchId('');
    setBranches([]);
    
    setFormData(prev => ({
      ...prev,
      course: courseName,
      branch: ''
    }));

    if (courseId) {
      const { data } = await supabase
        .from('config_branches')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('display_order');
      setBranches(data || []);
    }
  };

  const handleBranchChange = (branchId, branchName) => {
    setSelectedBranchId(branchId);
    setFormData(prev => ({
      ...prev,
      branch: branchName
    }));
  };

  // Handle file selection with drag and drop
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPEG, PNG, GIF, WebP) or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setCertificateFile(file);
    setError('');

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificatePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setCertificatePreview(''); // PDF, no preview
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setCertificateFile(null);
    setCertificatePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.registration_no || !formData.school || !formData.course) {
        throw new Error('Please fill all required fields');
      }

      if (!certificateFile) {
        throw new Error('Please upload your no-dues certificate');
      }

      // Upload certificate file
      setUploading(true);
      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${formData.registration_no}_${Date.now()}.${fileExt}`;
      const filePath = `manual-entries/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('no-dues-files')
        .upload(filePath, certificateFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('no-dues-files')
        .getPublicUrl(filePath);

      setUploading(false);

      // Submit to API
      const response = await fetch('/api/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_no: formData.registration_no,
          school: formData.school,
          course: formData.course,
          branch: formData.branch || null,
          school_id: selectedSchoolId,
          course_id: selectedCourseId,
          branch_id: selectedBranchId || null,
          certificate_url: publicUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit manual entry');
      }

      setSubmitSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message);
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`max-w-md w-full p-8 rounded-2xl text-center ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
            }`}
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ink-black'}`}>
              Submission Successful!
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your offline certificate has been registered successfully.
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              The department will verify your certificate shortly.
            </p>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-jecrc-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-jecrc-red" />
            </div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-ink-black'}`}>
              Register Offline Certificate
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Already completed your no-dues offline? Register it here.
            </p>
          </motion.div>

          {/* Info Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-500 mb-1">Important</h3>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Only for students who <strong>already have</strong> offline no-dues certificate</li>
                  <li>• Upload clear photo/scan of your certificate (PDF, JPEG, PNG)</li>
                  <li>• Your department will verify before approval</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className={`p-6 md:p-8 rounded-2xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-black/10'
            }`}
          >
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Registration Number */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.registration_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_no: e.target.value.toUpperCase() }))}
                  required
                  placeholder="e.g., 21JEXXXX"
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red'
                      : 'bg-white border-black/10 text-ink-black placeholder-gray-400 focus:border-jecrc-red'
                  }`}
                />
              </div>

              {/* School */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  School <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => {
                    const school = schools.find(s => s.id === e.target.value);
                    handleSchoolChange(e.target.value, school?.name || '');
                  }}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                      : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                  }`}
                >
                  <option value="">Select School</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              {/* Course */}
              {selectedSchoolId && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      const course = courses.find(c => c.id === e.target.value);
                      handleCourseChange(e.target.value, course?.name || '');
                    }}
                    required
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                        : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                    }`}
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Branch (Optional) */}
              {selectedCourseId && branches.length > 0 && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Branch/Specialization <span className="text-gray-400">(Optional)</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      const branch = branches.find(b => b.id === e.target.value);
                      handleBranchChange(e.target.value, branch?.name || '');
                    }}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      isDark
                        ? 'bg-white/5 border-white/10 text-white focus:border-jecrc-red'
                        : 'bg-white border-black/10 text-ink-black focus:border-jecrc-red'
                    }`}
                  >
                    <option value="">Select Branch (Optional)</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Certificate Upload with Drag & Drop */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  No-Dues Certificate <span className="text-red-500">*</span>
                </label>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Upload your offline certificate (PDF, JPEG, PNG, max 10MB)
                </p>
                
                {!certificateFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      isDark
                        ? 'border-white/20 hover:border-jecrc-red bg-white/5'
                        : 'border-gray-300 hover:border-jecrc-red bg-gray-50'
                    }`}
                    onClick={() => document.getElementById('certificate-input').click()}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                    <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Drop your certificate here
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      or click to browse
                    </p>
                    <input
                      id="certificate-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className={`border rounded-lg p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start gap-4">
                      {certificatePreview ? (
                        <img 
                          src={certificatePreview} 
                          alt="Certificate preview" 
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-red-500/20 rounded flex items-center justify-center">
                          <FileCheck className="w-8 h-8 text-red-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {certificateFile.name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {(certificateFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || uploading || !certificateFile}
                className="w-full bg-jecrc-red hover:bg-red-700 text-white py-4 rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || uploading ? (
                  <>
                    <LoadingSpinner />
                    <span>{uploading ? 'Uploading...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Submit for Verification</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </PageWrapper>
  );
}