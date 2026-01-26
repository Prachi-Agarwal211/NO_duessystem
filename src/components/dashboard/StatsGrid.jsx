'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function StatsGrid({ stats, loading = false, onFilterChange }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Normalize keys to handle both Admin and Staff API formats
  const safeStats = {
    pending: stats?.pending || stats?.pendingApplications || 0,
    approved: stats?.approved || stats?.approvedApplications || 0,
    rejected: stats?.rejected || stats?.rejectedApplications || 0,
    total: stats?.total || stats?.totalApplications || 0,
  };

  const cards = [
    {
      title: "Pending Review",
      value: safeStats.pending,
      icon: <Clock className="w-5 h-5" />,
      color: "text-amber-500",
      accentBg: "bg-amber-500/10",
      filter: "pending"
    },
    {
      title: "Approved",
      value: safeStats.approved,
      icon: <CheckCircle className="w-5 h-5" />,
      color: "text-green-500",
      accentBg: "bg-green-500/10",
      filter: "approved"
    },
    {
      title: "Rejected",
      value: safeStats.rejected,
      icon: <XCircle className="w-5 h-5" />,
      color: "text-red-500",
      accentBg: "bg-red-500/10",
      filter: "rejected"
    },
    {
      title: "Total Requests",
      value: safeStats.total,
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-500",
      accentBg: "bg-blue-500/10",
      filter: "all"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <button
          key={idx}
          onClick={() => onFilterChange && onFilterChange(card.filter)}
          className="w-full text-left active:scale-[0.98] transition-all"
        >
          <GlassCard variant="elegant" className="p-5 h-full relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-1 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {card.title}
                </p>
                {loading ? (
                  <div className="h-9 w-16 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse mt-1" />
                ) : (
                  <p className={`text-3xl font-bold transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {card.value}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl transition-all group-hover:scale-110 ${card.accentBg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            {/* Subtle bottom accent line */}
            <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 bg-current ${card.color}`} />
          </GlassCard>
        </button>
      ))}
    </div>
  );
}