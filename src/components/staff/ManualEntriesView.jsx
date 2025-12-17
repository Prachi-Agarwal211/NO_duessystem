'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Calendar,
  Mail,
  Phone,
  User,
  GraduationCap,
  Info,
  Search
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ManualEntriesView() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, [filter]);

  // ⚡ REAL-TIME: Subscribe to manual entries changes
  useEffect(() => {
    console.log('📡 ManualEntriesView: Setting up real-time subscription...');
    
    const channel = supabase
      .channel('manual_entries_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'no_dues_forms',
          filter: 'is_manual_entry=eq.true'
        },
        (payload) => {
          console.log('🔔 Manual entry change detected:', payload.eventType);
          console.log('📋 Changed record:', payload.new || payload.old);
          
          fetchEntries();
        }
      )
      .subscribe((status) => {
        console.log('📡 Manual entries subscription status:', status);
      });

    return () => {
      console.log('🧹 ManualEntriesView: Unsubscribing from real-time');
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const response = await fetch(`/api/manual-entry?staff_id=${user.id}${statusParam}`);
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.data);
      }
    } catch (error) {
      console.error('Error fetching manual entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search term (roll number)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntries(entries);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = entries.filter(entry =>
      entry.registration_no?.toLowerCase().includes(searchLower)
    );
    setFilteredEntries(filtered);
  }, [entries, searchTerm]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', icon: Clock },
      approved: { bg: 'bg-green-500/20', text: 'text-green-500', icon: CheckCircle },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-500', icon: XCircle }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className={`p-4 rounded-lg border ${
        isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <div className="flex-1">
            <h3 className={`font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Manual Entries - View Only
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              These are offline certificates submitted by students. <strong>Only Admin can approve/reject</strong> these entries. You can view the details and certificate for your reference.
            </p>
          </div>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-ink-black'}`}>
            Manual Entries
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            View offline certificate submissions (Read-only)
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-jecrc-red text-white'
                  : isDark
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar for Roll Number */}
      <div className="relative">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Roll Number / Registration Number..."
            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all ${
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:bg-white/10 focus:border-jecrc-red'
                : 'bg-white border-black/10 text-ink-black placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
            } outline-none`}
          />
        </div>
        
        {/* Active Search Filter Indicator */}
        {searchTerm && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Searching:
            </span>
            <button
              onClick={() => setSearchTerm('')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                isDark
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {searchTerm}
              <span className="ml-1">×</span>
            </button>
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              ({filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className={`p-12 rounded-xl text-center ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
        }`}>
          <FileCheck className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchTerm ? 'No matching entries found' : 'No manual entries found'}
          </p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {searchTerm
              ? `No entries found matching "${searchTerm}". Try a different roll number.`
              : filter === 'all'
                ? 'No students have submitted offline certificates yet'
                : `No ${filter} manual entries in your scope`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 rounded-xl border ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-white border-black/10 hover:shadow-lg'
              } transition-all cursor-pointer`}
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {entry.student_name}
                    </h3>
                    {getStatusBadge(entry.status)}
                  </div>
                  
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-mono">{entry.registration_no}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{entry.personal_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{entry.school} - {entry.course}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(entry.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(entry);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-ink-black'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${
              isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-black/10'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  Manual Entry Details
                </h3>
                {getStatusBadge(selectedEntry.status)}
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className={`p-2 rounded-lg ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Student Information */}
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  Student Information
                </h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Name:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.student_name}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Registration No:</span>
                    <p className={`font-mono font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.registration_no}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Personal Email:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.personal_email}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>College Email:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.college_email}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Contact:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.country_code} {selectedEntry.contact_no}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Parent Name:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.parent_name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  Academic Information
                </h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>School:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.school}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Course:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.course}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Branch:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.branch || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Session:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-ink-black'}`}>
                      {selectedEntry.admission_year} - {selectedEntry.passing_year}
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-ink-black'}`}>
                  Uploaded Certificate
                </h4>
                <a
                  href={selectedEntry.manual_certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-jecrc-red hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Certificate (PDF)
                </a>
              </div>

              {/* Read-Only Notice */}
              <div className={`p-4 rounded-lg border ${
                isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-2">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                      View Only - No Action Required
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-yellow-300/80' : 'text-yellow-600'}`}>
                      This is an informational view. Only the Admin can approve or reject manual entries. The admin has been notified and will take appropriate action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}