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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Realtime listener with debounce
    const channel = supabase.channel('staff_dash_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'no_dues_status' }, () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(fetchDashboard, 1000);
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, []);

  const handleAction = async (e, formId, departmentName, action) => {
    e.stopPropagation();
    
    // Optimistic Update
    const prevData = { ...data };
    setData(prev => ({
        ...prev,
        stats: { ...prev.stats, pending: Math.max(0, prev.stats.pending - 1) },
        applications: prev.applications.filter(app => app.no_dues_forms.id !== formId)
    }));
    toast.success('Processing...');

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
        toast.success("Updated successfully");
    } catch (err) {
        setData(prevData); // Revert on error
        toast.error("Action failed");
    }
  };

  const formatDate = (date) => {
      if (!date) return 'N/A';
      try { 
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); 
      } catch (e) { 
        return 'Invalid'; 
      }
  };

  const filtered = data.applications.filter(app => 
    app.no_dues_forms.student_name.toLowerCase().includes(search.toLowerCase()) ||
    app.no_dues_forms.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Department Dashboard</h1>
          <button 
            onClick={() => {setLoading(true); fetchDashboard();}} 
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Unified Stats Grid */}
        <StatsGrid stats={data.stats} loading={loading} />

        <div className="mb-6 relative">
             <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search by name or roll number..." 
                className="w-full md:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                onChange={(e) => setSearch(e.target.value)}
             />
        </div>

        <GlassCard className="overflow-hidden min-h-[300px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
              <thead className="bg-white/5 text-xs uppercase">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Roll No</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">No pending requests</td></tr>
                ) : (
                    filtered.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-white/5 cursor-pointer" 
                        onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                      >
                        <td className="p-4 font-medium text-white">{item.no_dues_forms.student_name}</td>
                        <td className="p-4 font-mono text-sm">{item.no_dues_forms.registration_no}</td>
                        <td className="p-4 text-sm">{formatDate(item.created_at)}</td>
                        <td className="p-4"><StatusBadge status={item.status} /></td>
                        <td className="p-4 text-right">
                           <div className="flex justify-end gap-2">
                             <button 
                               onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')} 
                               className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                             >
                               <CheckCircle className="w-5 h-5"/>
                             </button>
                             <button 
                               onClick={(e) => {e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`)}} 
                               className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
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
        </GlassCard>
      </div>
    </PageWrapper>
  );
}