'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useChat(formId, department, readerType = 'student') {
    const [messages, setMessages] = useState([]);
    const [form, setForm] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [failedMessages, setFailedMessages] = useState([]); // Track failed messages for retry
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

    const channelRef = useRef(null);

    // Fetch initial messages (no auth required for GET)
    const fetchMessages = useCallback(async (loadMore = false) => {
        if (!formId || !department) return;

        try {
            if (loadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const offset = loadMore ? pagination.offset + pagination.limit : 0;

            // Public access - no authorization header needed
            const response = await fetch(
                `/api/chat/${formId}/${encodeURIComponent(department)}?limit=50&offset=${offset}`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch messages');
            }

            if (loadMore) {
                // Prepend older messages
                setMessages(prev => [...(result.data.messages || []), ...prev]);
            } else {
                setMessages(result.data.messages || []);
            }

            setForm(result.data.form);
            setStatus(result.data.status);
            setHasMore(result.data.pagination?.hasMore || false);
            setPagination(result.data.pagination || { total: 0, limit: 50, offset: 0 });
            setError(null);

            // Mark messages as read
            markMessagesAsRead();
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [formId, department, pagination.offset, pagination.limit]);

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        if (!formId || !department) return;

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // For department staff, include auth token
            if (readerType === 'department') {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
            }

            await fetch('/api/chat/mark-read', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    formId,
                    departmentName: department,
                    readerType
                })
            });
        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    }, [formId, department, readerType]);

    // Send a message with retry support
    const sendMessage = useCallback(async (message, senderType, senderName, retryId = null) => {
        if (!message?.trim() || !formId || !department) return;

        const tempId = retryId || `temp-${Date.now()}`;

        try {
            setSending(true);

            // Remove from failed messages if retrying
            if (retryId) {
                setFailedMessages(prev => prev.filter(m => m.tempId !== retryId));
            }

            // Optimistic update - add message with temp id
            const optimisticMessage = {
                id: tempId,
                form_id: formId,
                department_name: department,
                sender_type: senderType,
                sender_name: senderName,
                message: message.trim(),
                created_at: new Date().toISOString(),
                is_sending: true
            };

            setMessages(prev => [...prev, optimisticMessage]);

            // For department staff, include auth token
            const headers = {
                'Content-Type': 'application/json'
            };

            if (senderType === 'department') {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('Department staff must be authenticated to send messages');
                }
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch(`/api/chat/${formId}/${encodeURIComponent(department)}`, {
                method: 'POST',
                headers,
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

            // Replace optimistic message with real one
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...result.data, is_sending: false } : m
            ));
            setError(null);

            return result.data;
        } catch (err) {
            console.error('Error sending message:', err);

            // Mark message as failed
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, is_sending: false, is_failed: true } : m
            ));

            // Add to failed messages for retry
            setFailedMessages(prev => [...prev, {
                tempId,
                message: message.trim(),
                senderType,
                senderName,
                error: err.message
            }]);

            setError(err.message);
            throw err;
        } finally {
            setSending(false);
        }
    }, [formId, department]);

    // Retry a failed message
    const retryMessage = useCallback((tempId) => {
        const failed = failedMessages.find(m => m.tempId === tempId);
        if (failed) {
            // Remove the failed message from the list first
            setMessages(prev => prev.filter(m => m.id !== tempId));
            sendMessage(failed.message, failed.senderType, failed.senderName, tempId);
        }
    }, [failedMessages, sendMessage]);

    // Load more (older) messages
    const loadMoreMessages = useCallback(() => {
        if (hasMore && !loadingMore) {
            fetchMessages(true);
        }
    }, [hasMore, loadingMore, fetchMessages]);

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
                        // Avoid duplicates (including temp optimistic messages)
                        if (prev.some(m => m.id === payload.new.id)) return prev;
                        // Remove optimistic message if it exists
                        const filtered = prev.filter(m =>
                            !(m.is_sending && m.message === payload.new.message)
                        );
                        return [...filtered, payload.new];
                    });

                    // Mark new messages as read
                    markMessagesAsRead();
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
    }, [formId, department]);

    return {
        messages,
        form,
        status,
        loading,
        sending,
        error,
        failedMessages,
        hasMore,
        loadingMore,
        sendMessage,
        retryMessage,
        loadMoreMessages,
        markMessagesAsRead,
        refresh: fetchMessages
    };
}
