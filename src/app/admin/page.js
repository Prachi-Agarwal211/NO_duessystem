'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { RefreshCcw, TrendingUp, Settings, GraduationCap, FileText, ChevronRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple Performance Chart Component
const PerformanceBar = ({ label, pending, approved, timeTaken }) => (
  <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-blue-500/30 transition-all">
    <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white capitalize">{label.replace(/_/g, ' ')}</h4>
        <div className="flex items-center gap-1 text-xs font-mono text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" /> {timeTaken || '~24'}h avg
        </div>
    </div>
    <div className="space-y-2">
        <div className="flex justify-between text-xs">
            <span className="text-yellow-600 dark:text-yellow-400">Pending: {pending}</span>
            <span className="text-green-600 dark:text-green-400">Cleared: {approved}</span>
        </div>
        <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
            <div className="bg-yellow-400 transition-all duration-500" style={{ width: `${(pending / (pending + approved || 1)) * 100}%` }} />
            <div className="bg-green-500 transition-all duration-500" style={{ width: `${(approved / (pending + approved || 1)) * 100}%` }} />
        </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState({ overallStats: {}, departmentStats: [] });
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef(null);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/staff/login'); return; }

      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.overallStats) setData(json);
    } catch (e) {
      console.error("Admin Sync Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ⚡ Realtime Monitoring (Students + Statuses)
  useEffect(() => {
    fetchStats();
    const channel = supabase.channel('admin_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'no_dues_forms' }, () => {
         if (debounceTimer.current) clearTimeout(debounceTimer.current);
         debounceTimer.current = setTimeout(fetchStats, 1500); // 1.5s debounce
         toast.success("New Application Received");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'no_dues_status' }, () => {
         if (debounceTimer.current) clearTimeout(debounceTimer.current);
         debounceTimer.current = setTimeout(fetchStats, 1500);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Command Center</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Realtime System Overview</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => router.push('/admin/settings')} className="p-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white group">
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
             </button>
             <button onClick={() => {setLoading(true); fetchStats();}} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20">
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </div>

        {/* 1. KEY METRICS */}
        <StatsGrid stats={data.overallStats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 2. DEPARTMENT PERFORMANCE & MONITORING (Left) */}
            <GlassCard className="lg:col-span-2 p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Department Efficiency</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.departmentStats.length === 0 ? (
                        <div className="col-span-2 text-center py-10 text-gray-400">No active data</div>
                    ) : (
                        data.departmentStats.map((dept) => (
                            <PerformanceBar 
                                key={dept.department_name}
                                label={dept.department_name} 
                                pending={dept.pending_count} 
                                approved={dept.approved_count}
                                timeTaken={dept.avg_hours || 12} // Mock data or add calculation in SQL
                            />
                        ))
                    )}
                </div>
            </GlassCard>

            {/* 3. QUICK ACTIONS (Right) */}
            <div className="space-y-4">
                <GlassCard className="p-6 cursor-pointer group hover:border-blue-500/50 transition-all" onClick={() => router.push('/admin/convocation')}>
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4">Convocation 2024</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage 9th Convocation List</p>
                </GlassCard>

                <GlassCard className="p-6 cursor-pointer group hover:border-emerald-500/50 transition-all" onClick={() => router.push('/admin/manual-entry')}>
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <FileText className="w-6 h-6" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4">Manual Entries</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Offline Records Database</p>
                </GlassCard>
            </div>
        </div>
      </div>
    </PageWrapper>
  );
}