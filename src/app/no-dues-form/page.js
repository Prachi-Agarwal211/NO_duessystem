'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BackgroundGradientAnimation from '@/components/ui/background-gradient-animation';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusTracker from '@/components/student/StatusTracker';
import { sendSubmissionNotification } from '@/lib/emailService';

export default function NoDuesFormPage() {
  const [formData, setFormData] = useState({
    student_name: '',
    registration_no: '',
    session_from: '',
    session_to: '',
    parent_name: '',
    school: 'Engineering',
    course: '',
    branch: '',
    contact_no: '',
    alumni_screenshot_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [existingForm, setExistingForm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [departments, setDepartments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, registration_no, role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        router.push('/login');
        return;
      }

      // Only students can access this page
      if (userData.role !== 'student') {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
      setFormData(prev => ({
        ...prev,
        student_name: userData.full_name,
        registration_no: userData.registration_no,
      }));

      // Check if form already exists
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!formError && form) {
        setExistingForm(form);
        setFormData(form);
      } else {
        setShowForm(true);
      }

      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('display_order');

      if (!deptError) {
        setDepartments(deptData);
      }

      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In a real app, you'd upload to storage and get a URL
    // For now, we'll just use a placeholder or base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        alumni_screenshot_url: event.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      if (existingForm) {
        // Update existing form
        const { error } = await supabase
          .from('no_dues_forms')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingForm.id);

        if (error) throw error;
      } else {
        // Create new form - status records will be created automatically by database trigger
        const { error } = await supabase
          .from('no_dues_forms')
          .insert([{
            ...formData,
            user_id: session.user.id,
            status: 'pending'
          }]);

        if (error) throw error;

        // Send notification email to department staff
        try {
          // Get department staff emails
          const { data: deptStaff, error: staffError } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'department');

          if (!staffError && deptStaff) {
            for (const staff of deptStaff) {
              await sendSubmissionNotification({
                email: staff.email,
                studentName: formData.student_name,
                registrationNo: formData.registration_no,
                formId: 'new' // Will be updated with actual ID
              });
            }
          }
        } catch (emailError) {
          console.error('Failed to send submission notifications:', emailError);
          // Don't fail the form submission if email fails
        }
      }

      // Refresh the page to show status tracker
      router.refresh();
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BackgroundGradientAnimation>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </BackgroundGradientAnimation>
    );
  }

  return (
    <BackgroundGradientAnimation>
      <div className="min-h-screen py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard>
            <h1 className="text-2xl font-bold text-center mb-8">
              {existingForm ? 'No Dues Status' : 'No Dues Application Form'}
            </h1>

            {existingForm ? (
              <StatusTracker 
                formId={existingForm.id} 
                currentStatus={existingForm.status}
                departments={departments}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {submitError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Student Name</label>
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Registration Number</label>
                    <input
                      type="text"
                      name="registration_no"
                      value={formData.registration_no}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Session (From)</label>
                    <input
                      type="text"
                      name="session_from"
                      value={formData.session_from}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Session (To)</label>
                    <input
                      type="text"
                      name="session_to"
                      value={formData.session_to}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Parent Name</label>
                    <input
                      type="text"
                      name="parent_name"
                      value={formData.parent_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">School</label>
                    <select
                      name="school"
                      value={formData.school}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Management">Management</option>
                      <option value="Law">Law</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Course</label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Branch</label>
                    <input
                      type="text"
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Number</label>
                    <input
                      type="text"
                      name="contact_no"
                      value={formData.contact_no}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Alumni Verification Screenshot (if applicable)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  {formData.alumni_screenshot_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.alumni_screenshot_url} 
                        alt="Alumni verification" 
                        className="max-w-xs h-auto rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : (existingForm ? 'Update Form' : 'Submit Form')}
                </button>
              </form>
            )}
          </GlassCard>
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
