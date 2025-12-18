'use client';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function StatsGrid({ stats, role = 'staff', loading = false }) {
  // Normalize data keys (Handling the API mismatch)
  const safeStats = {
    total: stats?.total || stats?.totalApplications || 0,
    pending: stats?.pending || stats?.pendingApplications || 0,
    approved: stats?.approved || stats?.approvedApplications || 0,
    rejected: stats?.rejected || stats?.rejectedApplications || 0,
  };

  const cards = [
    {
      title: "Pending Review",
      value: safeStats.pending,
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20"
    },
    {
      title: "Approved",
      value: safeStats.approved,
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
    {
      title: "Rejected",
      value: safeStats.rejected,
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
    {
      title: "Total Requests",
      value: safeStats.total,
      icon: <Users className="w-5 h-5 text-blue-400" />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className={`p-5 rounded-2xl border backdrop-blur-xl ${card.bg} ${card.border} transition-all hover:scale-[1.02]`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{card.title}</p>
            <div className={`p-2 rounded-lg bg-white/5 ${card.color}`}>
              {card.icon}
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
          ) : (
            <h3 className={`text-3xl font-bold ${card.color}`}>
              {card.value}
            </h3>
          )}
        </div>
      ))}
    </div>
  );
}