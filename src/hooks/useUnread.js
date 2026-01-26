'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook to manage unread chat message counts
 * @param {string} type - 'staff' or 'student'
 * @param {string} id - userId for staff, formId for student
 */
export function useUnread(type, id) {
    const [unreadCounts, setUnreadCounts] = useState({});
    const [totalUnread, setTotalUnread] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchUnreadCounts = useCallback(async () => {
        try {
            if (type === 'staff') {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const res = await fetch('/api/chat/unread', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const json = await res.json();
                if (json.success) {
                    const counts = {};
                    json.data.counts.forEach(c => {
                        counts[c.form_id] = c.unread_count;
                    });
                    setUnreadCounts(counts);
                    setTotalUnread(json.data.total_unread);
                }
            } else if (type === 'student' && id) {
                // For students, id is the formId
                const { data, error } = await supabase
                    .from('no_dues_messages')
                    .select('department_name')
                    .eq('form_id', id)
                    .eq('sender_type', 'department')
                    .eq('is_read', false);

                if (!error && data) {
                    const counts = {};
                    data.forEach(m => {
                        counts[m.department_name] = (counts[m.department_name] || 0) + 1;
                    });
                    setUnreadCounts(counts);
                    setTotalUnread(data.length);
                }
            }
        } catch (err) {
            console.error('Failed to fetch unread counts:', err);
        } finally {
            setLoading(false);
        }
    }, [type, id]);

    useEffect(() => {
        fetchUnreadCounts();

        // Subscribe to new messages
        const channel = supabase
            .channel(`unread-tracker-${type}-${id || 'all'}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'no_dues_messages'
            }, (payload) => {
                // For staff: if new student message
                if (type === 'staff' && payload.new.sender_type === 'student') {
                    fetchUnreadCounts();
                }
                // For student: if message for their form from department
                if (type === 'student' && id && payload.new.form_id === id && payload.new.sender_type === 'department') {
                    fetchUnreadCounts();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'no_dues_messages'
            }, (payload) => {
                // If marks as read
                if (payload.new.is_read) {
                    fetchUnreadCounts();
                }
            })
            .subscribe();

        // Listen for internal "mark as read" events to update quickly
        const handleMarkedRead = () => fetchUnreadCounts();
        window.addEventListener('chat-marked-read', handleMarkedRead);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('chat-marked-read', handleMarkedRead);
        };
    }, [type, id, fetchUnreadCounts]);

    return { unreadCounts, totalUnread, loading, refresh: fetchUnreadCounts };
}
