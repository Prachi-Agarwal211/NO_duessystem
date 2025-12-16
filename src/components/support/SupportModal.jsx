'use client';

import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

/**
 * SupportModal - Generic support modal for unauthenticated users
 * Allows manual entry of all fields
 */
export default function SupportModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_type: 'guest'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Support ticket submitted successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
        onClose();
      } else {
        toast.error(result.error || 'Failed to submit support ticket');
      }
    } catch (error) {
      console.error('Support submission error:', error);
      toast.error('Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Contact Support
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Your Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                isDark 
                  ? 'bg-black/50 border-white/10 text-white focus:border-jecrc-red' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red'
              } focus:outline-none focus:ring-2 focus:ring-jecrc-red/20`}
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                isDark 
                  ? 'bg-black/50 border-white/10 text-white focus:border-jecrc-red' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red'
              } focus:outline-none focus:ring-2 focus:ring-jecrc-red/20`}
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                isDark 
                  ? 'bg-black/50 border-white/10 text-white focus:border-jecrc-red' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red'
              } focus:outline-none focus:ring-2 focus:ring-jecrc-red/20`}
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={5}
              className={`w-full px-4 py-2 rounded-lg border transition-colors resize-none ${
                isDark 
                  ? 'bg-black/50 border-white/10 text-white focus:border-jecrc-red' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red'
              } focus:outline-none focus:ring-2 focus:ring-jecrc-red/20`}
              placeholder="Describe your issue in detail..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-jecrc-red hover:bg-jecrc-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}