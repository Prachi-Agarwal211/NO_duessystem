'use client';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StatsGrid({ stats, loading = false, onFilterChange }) {
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
      lightIconBg: "bg-yellow-100",
      darkIconBg: "dark:bg-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      lightBg: "bg-white",
      darkBg: "dark:bg-white/5",
      borderColor: "border-gray-200 dark:border-white/10",
      borderLeft: "border-l-4 border-l-yellow-500"
    },
    {
      title: "Approved",
      value: safeStats.approved,
      icon: <CheckCircle className="w-5 h-5" />,
      lightIconBg: "bg-green-100",
      darkIconBg: "dark:bg-green-500/20",
      iconColor: "text-green-600 dark:text-green-400",
      lightBg: "bg-white",
      darkBg: "dark:bg-white/5",
      borderColor: "border-gray-200 dark:border-white/10",
      borderLeft: "border-l-4 border-l-green-500"
    },
    {
      title: "Rejected",
      value: safeStats.rejected,
      icon: <XCircle className="w-5 h-5" />,
      lightIconBg: "bg-red-100",
      darkIconBg: "dark:bg-red-500/20",
      iconColor: "text-red-600 dark:text-red-400",
      lightBg: "bg-white",
      darkBg: "dark:bg-white/5",
      borderColor: "border-gray-200 dark:border-white/10",
      borderLeft: "border-l-4 border-l-red-500"
    },
    {
      title: "Total Requests",
      value: safeStats.total,
      icon: <Users className="w-5 h-5" />,
      lightIconBg: "bg-red-100",
      darkIconBg: "dark:bg-jecrc-red/20",
      iconColor: "text-jecrc-red dark:text-red-400",
      lightBg: "bg-white",
      darkBg: "dark:bg-white/5",
      borderColor: "border-gray-200 dark:border-white/10",
      borderLeft: "border-l-4 border-l-jecrc-red"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <button
          key={idx}
          onClick={() => onFilterChange && onFilterChange(card.title.toLowerCase().replace(' ', '_'))}
          className={`p-4 sm:p-5 md:p-6 rounded-xl border ${card.lightBg} ${card.darkBg} ${card.borderColor} ${card.borderLeft} transition-all hover:shadow-lg cursor-pointer text-left w-full min-h-[44px] active:scale-[0.98] ${onFilterChange ? 'hover:scale-[1.02]' : ''}`}
        >
          <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{card.title}</p>
            <div className={`p-2.5 rounded-xl ${card.lightIconBg} ${card.darkIconBg} ${card.iconColor}`}>
              {card.icon}
            </div>
          </div>
          {loading ? (
            <div className="h-9 w-20 bg-gray-100 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {card.value}
            </h3>
          )}
        </button>
      ))}
    </div>
  );
}