'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useChat } from '@/hooks/useChat';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import ChatBox from '@/components/chat/ChatBox';
import { ArrowLeft } from 'lucide-react';

export default function StudentChatPage() {
    const { formId, department } = useParams();
    const router = useRouter();
    const decodedDepartment = decodeURIComponent(department);

    const [user, setUser] = useState(null);
    const [studentName, setStudentName] = useState('');
    const [authLoading, setAuthLoading] = useState(true);

    const { messages, form, status, loading, sending, error, sendMessage } = useChat(formId, decodedDepartment);

    // Check auth and get user info
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/student/login');
                return;
            }

            // Get student profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

            setUser(session.user);
            setStudentName(profile?.full_name || 'Student');
            setAuthLoading(false);
        };

        checkAuth();
    }, [router]);

    if (authLoading) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin text-4xl">⟳</div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/student/status')}
                        className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Status
                    </button>

                    {/* Form Info Header */}
                    {form && (
                        <GlassCard className="p-4 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-gray-900 dark:text-white">
                                        {form.student_name}
                                    </h2>
                                    <p className="text-sm text-gray-500 font-mono">
                                        {form.registration_no}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status?.status === 'rejected'
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                        {status?.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {/* Chat Box */}
                    <ChatBox
                        messages={messages}
                        loading={loading}
                        sending={sending}
                        error={error}
                        onSend={sendMessage}
                        currentUserType="student"
                        currentUserName={studentName}
                        rejectionReason={status?.rejection_reason}
                        departmentName={decodedDepartment}
                    />
                </div>
            </div>
        </PageWrapper>
    );
}
