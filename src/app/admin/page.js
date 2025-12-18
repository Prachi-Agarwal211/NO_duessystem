'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { RefreshCcw, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState({ overallStats: {}, departmentStats: [] });
  const [loading, setLoading] = useState(true);

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
      console.error(e);
      toast.error("Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">System Overview</h1>
            <p className="text-gray-400 text-sm mt-1">Admin Control Center</p>
          </div>
          <button onClick={() => {setLoading(true); fetchStats();}} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Unified Stats Grid */}
        <StatsGrid stats={data.overallStats} loading={loading} />

        {/* Department Workload Table */}
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Department Performance</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-white/5 text-xs uppercase">
                        <tr>
                            <th className="p-3">Department</th>
                            <th className="p-3">Pending</th>
                            <th className="p-3">Approved</th>
                            <th className="p-3">Rejected</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.departmentStats.length === 0 ? (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-500">No data available</td></tr>
                        ) : (
                            data.departmentStats.map(d => (
                                <tr key={d.department_name} className="hover:bg-white/5">
                                    <td className="p-3 font-medium text-white capitalize">{d.department_name.replace(/_/g, ' ')}</td>
                                    <td className="p-3 text-yellow-400 font-bold">{d.pending_count}</td>
                                    <td className="p-3 text-green-400">{d.approved_count}</td>
                                    <td className="p-3 text-red-400">{d.rejected_count}</td>
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