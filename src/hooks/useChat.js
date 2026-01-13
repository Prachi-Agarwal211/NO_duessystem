'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useChat(formId, department) {
    const [messages, setMessages] = useState([]);
    const [form, setForm] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const channelRef = useRef(null);

    // Fetch initial messages
    const fetchMessages = useCallback(async () => {
        if (!formId || !department) return;

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError('Not authenticated');
                return;
            }

            const response = await fetch(`/api/chat/${formId}/${encodeURIComponent(department)}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch messages');
            }

            setMessages(result.data.messages || []);
            setForm(result.data.form);
            setStatus(result.data.status);
            setError(null);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [formId, department]);

    // Send a message
    const sendMessage = useCallback(async (message, senderType, senderName) => {
        if (!message?.trim() || !formId || !department) return;

        try {
            setSending(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/chat/${formId}/${encodeURIComponent(department)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    message,
                    senderType,
                    senderName
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send message');
            }

            // Optimistic update - add message immediately
            setMessages(prev => [...prev, result.data]);
            setError(null);

            return result.data;
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err.message);
            throw err;
        } finally {
            setSending(false);
        }
    }, [formId, department]);

    // Set up realtime subscription
    useEffect(() => {
        if (!formId || !department) return;

        // Initial fetch
        fetchMessages();

        // Subscribe to realtime updates
        const channel = supabase
            .channel(`chat-${formId}-${department}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'no_dues_messages',
                filter: `form_id=eq.${formId}`
            }, (payload) => {
                // Only add if for this department and not already in list
                if (payload.new.department_name === department) {
                    setMessages(prev => {
                        // Avoid duplicates
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Subscribed to chat realtime');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [formId, department, fetchMessages]);

    return {
        messages,
        form,
        status,
        loading,
        sending,
        error,
        sendMessage,
        refresh: fetchMessages
    };
}
