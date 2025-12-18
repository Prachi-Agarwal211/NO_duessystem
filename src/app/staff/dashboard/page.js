'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { RefreshCcw, Search, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const router = useRouter();
  const [data, setData] = useState({ stats: {}, applications: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceTimer = useRef(null);

  const fetchDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/staff/login'); return; }

      const res = await fetch('/api/staff/dashboard', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error("Staff Dashboard Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // ⚡⚡ STAFF REALTIME - Listens for status changes ⚡⚡
    const channel = supabase.channel('staff_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'no_dues_status' }, () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            console.log("⚡ New Task/Update Detected - Refreshing Staff...");
            fetchDashboard();
        }, 1000);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleAction = async (e, formId, departmentName, action) => {
    e.stopPropagation();
    
    // 1. Optimistic UI Update (Instant Feedback)
    const prevData = { ...data };
    setData(prev => ({
        ...prev,
        stats: { 
            ...prev.stats, 
            pending: Math.max(0, prev.stats.pending - 1),
            approved: action === 'approve' ? prev.stats.approved + 1 : prev.stats.approved,
            rejected: action === 'reject' ? prev.stats.rejected + 1 : prev.stats.rejected
        },
        applications: prev.applications.filter(app => app.no_dues_forms.id !== formId)
    }));
    toast.success('Processing...');

    // 2. API Call
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/staff/action', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}` 
            },
            body: JSON.stringify({ formId, departmentName, action, reason: "Quick Action" })
        });
        if (!res.ok) throw new Error('Failed');
        toast.success(action === 'approve' ? 'Approved ✓' : 'Rejected');
    } catch (err) {
        setData(prevData); // Rollback if failed
        toast.error("Action failed, rolling back.");
    }
  };

  // Safe Date Formatter
  const formatDate = (date) => {
      if (!date) return 'N/A';
      try { 
          return new Date(date).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
          }); 
      }
      catch (e) { return 'Invalid'; }
  };

  const filtered = data.applications.filter(app => 
    app.no_dues_forms.student_name.toLowerCase().includes(search.toLowerCase()) ||
    app.no_dues_forms.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Dashboard</h1>
             <p className="text-gray-500 dark:text-gray-400 text-sm">Realtime Pending List</p>
          </div>
          <button 
            onClick={() => {setLoading(true); fetchDashboard();}} 
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <StatsGrid stats={data.stats} loading={loading} />

        <div className="mb-6 relative">
             <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search students..." 
                className="w-full md:w-96 pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                onChange={(e) => setSearch(e.target.value)}
             />
        </div>

        <GlassCard className="overflow-hidden min-h-[300px]">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Roll No</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-400">No pending requests</td></tr>
                  ) : (
                      filtered.map((item) => (
                        <tr 
                          key={item.id} 
                          className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" 
                          onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                        >
                          <td className="p-4 font-medium text-gray-900 dark:text-white">{item.no_dues_forms.student_name}</td>
                          <td className="p-4 font-mono text-sm">{item.no_dues_forms.registration_no}</td>
                          <td className="p-4 text-sm">{item.no_dues_forms.course} - {item.no_dues_forms.branch}</td>
                          <td className="p-4 text-sm">{formatDate(item.no_dues_forms.created_at)}</td>
                          <td className="p-4"><StatusBadge status={item.status} /></td>
                          <td className="p-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')} 
                                  className="p-2 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/20 transition-all"
                                  title="Quick Approve"
                                >
                                  <CheckCircle className="w-5 h-5"/>
                                </button>
                               <button 
                                  onClick={(e) => {e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`)}} 
                                  className="p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-all"
                                  title="View Details / Reject"
                                >
                                  <XCircle className="w-5 h-5"/>
                                </button>
                             </div>
                          </td>
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