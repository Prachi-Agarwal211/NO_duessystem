'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StaffHistory() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/staff/login');

      try {
        const res = await fetch('/api/staff/history', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (json.success) {
          // API returns { data: { history: [...] } }
          setHistory(json.data?.history || []);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filtered = history.filter(item =>
    item.no_dues_forms?.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.no_dues_forms?.registration_no?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Action History</h1>
                <p className="text-gray-500 dark:text-gray-400">View past approvals and rejections.</p>
            </div>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search history..." 
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        <GlassCard className="min-h-[500px]">
            {loading ? (
                <div className="p-8 text-center text-gray-400">Loading history...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-600 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="p-4">Action</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Action Date</th>
                                <th className="p-4">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No records found.</td></tr>
                            ) : (
                                filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            {item.status === 'approved' 
                                                ? <span className="flex items-center gap-2 text-green-600 font-medium"><CheckCircle className="w-4 h-4"/> Approved</span> 
                                                : <span className="flex items-center gap-2 text-red-600 font-medium"><XCircle className="w-4 h-4"/> Rejected</span>
                                            }
                                        </td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms?.student_name || 'N/A'}</td>
                                                <td className="p-4 font-mono text-sm">{item.no_dues_forms?.registration_no || 'N/A'}</td>
                                        <td className="p-4 text-sm flex items-center gap-2">
                                            <Clock className="w-3 h-3" /> {formatDate(item.action_at)}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{item.rejection_reason || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </GlassCard>
      </div>
    </PageWrapper>
  );
}