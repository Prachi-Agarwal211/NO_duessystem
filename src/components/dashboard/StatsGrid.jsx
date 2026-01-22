'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';

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
      gradient: "from-yellow-400 to-amber-500",
      lightIconBg: "bg-yellow-100",
      darkIconBg: "dark:bg-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      borderLeft: "border-l-yellow-500"
    },
    {
      title: "Approved",
      value: safeStats.approved,
      icon: <CheckCircle className="w-5 h-5" />,
      gradient: "from-green-400 to-emerald-500",
      lightIconBg: "bg-green-100",
      darkIconBg: "dark:bg-green-500/20",
      iconColor: "text-green-600 dark:text-green-400",
      borderLeft: "border-l-green-500"
    },
    {
      title: "Rejected",
      value: safeStats.rejected,
      icon: <XCircle className="w-5 h-5" />,
      gradient: "from-red-400 to-pink-500",
      lightIconBg: "bg-red-100",
      darkIconBg: "dark:bg-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      borderLeft: "border-l-red-500"
    },
    {
      title: "Total Requests",
      value: safeStats.total,
      icon: <Users className="w-5 h-5" />,
      gradient: "from-jecrc-red to-jecrc-red-dark",
      lightIconBg: "bg-red-100",
      darkIconBg: "dark:bg-jecrc-red/20",
      iconColor: "text-jecrc-red dark:text-red-400",
      borderLeft: "border-l-jecrc-red"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {cards.map((card, idx) => (
        <button
          key={idx}
          onClick={() => onFilterChange && onFilterChange(card.title.toLowerCase().replace(' ', '_'))}
          className={`
            p-4 sm:p-5 md:p-6 rounded-xl border text-left w-full min-h-[44px] active:scale-[0.98] transition-all
            ${isDark 
                ? 'bg-gradient-to-br from-white/5 to-white/10 border-white/10 hover:border-white/20' 
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
            }
            ${onFilterChange ? 'hover:scale-[1.02] cursor-pointer' : ''}
            ${card.borderLeft}
          `}
        >
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{card.title}</p>
            <div className={`
                p-2.5 rounded-xl 
                bg-gradient-to-br ${card.gradient}
                shadow-lg shadow-opacity-20
            `}>
              <div className="text-white drop-shadow-md">
                {card.icon}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-20 bg-gray-100 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <h3 className={`
                text-2xl sm:text-3xl font-bold
                ${isDark ? 'text-white' : 'text-gray-900'}
            `}>
              {card.value}
            </h3>
          )}
        </button>
      ))}
    </div>
  );
}