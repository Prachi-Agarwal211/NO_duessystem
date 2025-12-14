'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

export default function SupportModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    requesterType: 'student',
    email: '',
    rollNumber: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequesterTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      requesterType: type,
      rollNumber: type === 'department' ? '' : prev.rollNumber
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

      if (formData.requesterType === 'student' && !formData.rollNumber) {
        toast.error('Roll number is required for students');
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
          rollNumber: formData.rollNumber || null,
          subject: formData.subject || 'Support Request',
          message: formData.message,
          requesterType: formData.requesterType
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit support request');
      }

      setTicketNumber(data.ticket.ticketNumber);
      setSubmitSuccess(true);
      toast.success('Support request submitted successfully!');

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          requesterType: 'student',
          email: '',
          rollNumber: '',
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
        requesterType: 'student',
        email: '',
        rollNumber: '',
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
                      ${isDark ? 'bg-jecrc-red/20' : 'bg-jecrc-red/10'}`}
                    >
                      <MessageSquare className="w-6 h-6 text-jecrc-red" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Need Support?
                      </h2>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        We're here to help with any issues or questions
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Requester Type Selector */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        I am a <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleRequesterTypeChange('student')}
                          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all
                            ${formData.requesterType === 'student'
                              ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20'
                              : isDark
                                ? 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                            }`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequesterTypeChange('department')}
                          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all
                            ${formData.requesterType === 'department'
                              ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20'
                              : isDark
                                ? 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                            }`}
                        >
                          Department Staff
                        </button>
                      </div>
                    </div>

                    {/* Email */}
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
                        placeholder={formData.requesterType === 'student' ? 'your.email@student.com' : 'department@jecrc.ac.in'}
                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all
                          ${isDark
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-white/10'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                          }`}
                      />
                    </div>

                    {/* Roll Number (Students only) */}
                    {formData.requesterType === 'student' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Roll Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="rollNumber"
                          value={formData.rollNumber}
                          onChange={handleChange}
                          required
                          placeholder="21BCON123"
                          className={`w-full px-4 py-3 rounded-lg border outline-none transition-all uppercase
                            ${isDark
                              ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-white/10'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                            }`}
                        />
                      </div>
                    )}

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
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-white/10'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
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
                        placeholder="Describe your issue or question in detail. The more information you provide, the better we can help you."
                        className={`w-full px-4 py-3 rounded-lg border outline-none transition-all resize-none
                          ${isDark
                            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-jecrc-red focus:bg-white/10'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
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
                      className="w-full px-6 py-3 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-medium rounded-lg
                        transition-all duration-200 flex items-center justify-center gap-2
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-lg shadow-jecrc-red/20 hover:shadow-xl hover:shadow-jecrc-red/30"
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
                    <p className={`text-xl font-bold ${isDark ? 'text-jecrc-red' : 'text-jecrc-red'}`}>
                      {ticketNumber}
                    </p>
                  </div>
                  
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Our team will review your request and respond via email soon.
                  </p>
                  
                  <button
                    onClick={handleClose}
                    className="mt-6 px-6 py-2 bg-jecrc-red hover:bg-jecrc-red-dark text-white font-medium rounded-lg
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