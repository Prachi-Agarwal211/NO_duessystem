'use client';
import { useState } from 'react';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateTicketModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ subject: '', category: 'general', message: '', priority: 'normal' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call for now (since we aren't touching DB yet)
    await new Promise(r => setTimeout(r, 1000)); 
    toast.success("Ticket created successfully!");
    onSuccess();
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Support Request</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white"
              placeholder="Brief description of the issue"
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select 
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-black/20 outline-none text-gray-900 dark:text-white"
                    onChange={e => setFormData({...formData, category: e.target.value})}
                >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Issue</option>
                    <option value="dues">No-Dues Status</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select 
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-black/20 outline-none text-gray-900 dark:text-white"
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea 
              required
              rows="4"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-gray-900 dark:text-white"
              placeholder="Explain your issue in detail..."
              onChange={e => setFormData({...formData, message: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          >
            {loading ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Request</>}
          </button>
        </form>
      </div>
    </div>
  );
}