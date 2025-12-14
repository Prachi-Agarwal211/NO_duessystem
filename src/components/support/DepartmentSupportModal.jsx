'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * DepartmentSupportModal - Department staff-specific support form
 * Auto-populates email from authenticated user
 * Hides roll number field (not applicable for staff)
 * No type selector needed - defaults to 'department'
 */
export default function DepartmentSupportModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  // Auto-populate email from auth context
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.email || !formData.message) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      if (formData.message.length < 10) {
        toast.error('Please provide a more detailed message (at least 10 characters)');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          rollNumber: null, // No roll number for department staff
          subject: formData.subject || 'Support Request',
          message: formData.message,
          requesterType: 'department' // Always department for this modal
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit support request');
      }

      setTicketNumber(data.ticket.ticketNumber);
      setSubmitSuccess(true);
      toast.success('Support request submitted successfully!');

      // Reset form after 5 seconds
      setTimeout(() => {
        setFormData({
          email: user?.email || '',
          subject: '',
          message: ''
        });
        setSubmitSuccess(false);
        setTicketNumber('');
        onClose();
      }, 5000);

    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error(error.message || 'Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: user?.email || '',
        subject: '',
        message: ''
      });
      setSubmitSuccess(false);
      setTicketNumber('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl
              ${isDark 
                ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/10' 
                : 'bg-white border border-gray-200'
              }`}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-all
                ${isDark 
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } disabled:opacity-50`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-8">
              {!submitSuccess ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                      ${isDark ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}
                    >
                      <MessageSquare className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Department Support
                      </h2>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Get help with system issues or administrative questions
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email (Read-only) */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        readOnly
                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all
                          ${isDark
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                          } cursor-not-allowed opacity-75`}
                      />
                      {profile?.department_name && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          Department: {profile.department_name}
                        </p>
                      )}
                    </div>

                    {/* Subject (Optional) */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Subject <span className="text-gray-500 text-xs">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief description of your issue"
                        maxLength={100}
                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all
                          ${isDark
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          }`}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Your Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Describe your issue or question in detail. Include relevant department information if applicable."
                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all resize-none
                          ${isDark
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:bg-white/10'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                          }`}
                      />
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {formData.message.length}/5000 characters
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg
                        transition-all duration-200 flex items-center justify-center gap-2
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-600/30"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Support Request
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Success Message */
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </motion.div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Request Submitted!
                  </h3>
                  
                  <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Your support ticket has been created successfully
                  </p>
                  
                  <div className={`inline-block px-6 py-3 rounded-lg mb-6
                    ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}
                  >
                    <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Your Ticket Number
                    </p>
                    <p className={`text-xl font-bold text-purple-500`}>
                      {ticketNumber}
                    </p>
                  </div>
                  
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Our technical team will review your request and respond via email soon.
                  </p>
                  
                  <button
                    onClick={handleClose}
                    className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg
                      transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}