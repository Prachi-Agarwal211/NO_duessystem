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
  const [data, setData] = useState({ overallStats: {}, departmentStats: [], recentActivity: [] });
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
      if (json.overallStats) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStats(); 
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">System Overview</h1>
            <p className="text-sm text-gray-400 mt-1">Real-time Dashboard</p>
          </div>
          <button 
            onClick={() => {setLoading(true); fetchStats();}} 
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white transition-all"
            disabled={loading}
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ✅ UNIFIED STATS GRID */}
        <StatsGrid stats={data.overallStats} loading={loading} role="admin" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Workload Table */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Department Workload</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                  <thead className="bg-white/5 text-xs uppercase font-medium">
                    <tr>
                      <th className="p-3 rounded-l-lg">Department</th>
                      <th className="p-3">Pending</th>
                      <th className="p-3">Approved</th>
                      <th className="p-3 rounded-r-lg">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="p-8">
                          <div className="space-y-3">
                            {[1,2,3].map(i => (
                              <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : data.departmentStats.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500">No data available</td>
                      </tr>
                    ) : (
                      data.departmentStats.map(d => {
                        const total = (d.pending_count || 0) + (d.approved_count || 0) + (d.rejected_count || 0);
                        const progress = total > 0 ? Math.round(((d.approved_count || 0) / total) * 100) : 0;
                        return (
                          <tr key={d.department_name} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-medium text-white capitalize">
                              {d.department_name.replace(/_/g, ' ')}
                            </td>
                            <td className="p-3 text-yellow-400 font-bold">{d.pending_count || 0}</td>
                            <td className="p-3 text-green-400">{d.approved_count || 0}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" 
                                    style={{ width: `${progress}%` }} 
                                  />
                                </div>
                                <span className="text-xs text-gray-400">{progress}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-full">
              <h2 className="text-xl font-bold text-white mb-6">Recent Actions</h2>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
                    ))}
                  </div>
                ) : data.recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm py-8">No recent activity</p>
                ) : (
                  data.recentActivity.map((act) => (
                    <div 
                      key={act.id} 
                      className="flex gap-3 items-start p-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="mt-1">
                        {act.status === 'approved' ? (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {act.no_dues_forms?.student_name || 'Unknown'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {act.department_name?.replace(/_/g, ' ')} • {formatDate(act.action_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}