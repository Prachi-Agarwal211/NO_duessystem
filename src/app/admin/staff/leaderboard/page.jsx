'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
    ArrowLeft,
    Trophy,
    Medal,
    Clock,
    CheckCircle,
    Activity,
    TrendingUp
} from 'lucide-react';

const SORT_OPTIONS = [
    { key: 'total_actions', label: 'Most Actions', icon: Activity },
    { key: 'approval_rate', label: 'Highest Approval', icon: CheckCircle },
    { key: 'avg_response_hours', label: 'Fastest Response', icon: Clock },
    { key: 'active_days', label: 'Most Consistent', icon: TrendingUp },
];

export default function LeaderboardPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('total_actions');

    useEffect(() => {
        fetchLeaderboard();
    }, [sortBy]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/admin/login');
                return;
            }

            const response = await fetch(`/api/admin/staff/leaderboard?sortBy=${sortBy}&limit=20`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            const result = await response.json();
            if (result.success) {
                setLeaderboard(result.data?.leaderboard || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400" />;
            case 3:
                return <Medal className="w-6 h-6 text-amber-600" />;
            default:
                return (
                    <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {rank}
                    </span>
                );
        }
    };

    const getRowStyle = (rank) => {
        if (rank === 1) return isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200';
        if (rank === 2) return isDark ? 'bg-gray-500/10 border-gray-500/30' : 'bg-gray-50 border-gray-200';
        if (rank === 3) return isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200';
        return isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner text="Loading Leaderboard..." />
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-6 ${isDark ? 'bg-ink-black' : 'bg-gray-50'}`}>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/staff')}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                                }`}
                        >
                            <ArrowLeft className={isDark ? 'text-white' : 'text-gray-700'} />
                        </button>
                        <div>
                            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                Staff Leaderboard
                            </h1>
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                Top performing staff members
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sort Options */}
                <GlassCard className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {SORT_OPTIONS.map(option => (
                            <button
                                key={option.key}
                                onClick={() => setSortBy(option.key)}
                                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${sortBy === option.key
                                        ? 'bg-jecrc-red text-white shadow-lg'
                                        : isDark
                                            ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <option.icon className="w-4 h-4" />
                                {option.label}
                            </button>
                        ))}
                    </div>
                </GlassCard>

                {/* Leaderboard Table */}
                <GlassCard className="overflow-hidden">
                    {error ? (
                        <div className="p-8 text-center text-red-500">{error}</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-8 text-center">
                            <Trophy className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                No staff with activity yet
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {leaderboard.map((member) => (
                                <div
                                    key={member.staff_id}
                                    className={`flex items-center gap-4 p-4 border-l-4 transition-colors cursor-pointer ${getRowStyle(member.rank)}`}
                                    onClick={() => router.push(`/admin/staff/${member.staff_id}`)}
                                >
                                    {/* Rank */}
                                    <div className="w-12 flex justify-center">
                                        {getRankBadge(member.rank)}
                                    </div>

                                    {/* Avatar & Name */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${member.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                                member.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                                                    member.rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                                                        'bg-gradient-to-br from-blue-500 to-blue-700'
                                            }`}>
                                            {member.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {member.full_name}
                                            </p>
                                            <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {member.department_display}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6 text-center">
                                        <div>
                                            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {member.total_actions}
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Actions
                                            </p>
                                        </div>
                                        <div>
                                            <p className={`text-lg font-bold ${(member.approval_rate || 0) >= 90 ? 'text-green-500' :
                                                    (member.approval_rate || 0) >= 70 ? 'text-yellow-500' : 'text-red-500'
                                                }`}>
                                                {member.approval_rate || 0}%
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Approval
                                            </p>
                                        </div>
                                        <div>
                                            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {member.avg_response_hours ? `${Math.round(member.avg_response_hours)}h` : 'N/A'}
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Avg Time
                                            </p>
                                        </div>
                                        <div>
                                            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {member.active_days}
                                            </p>
                                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Active Days
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
