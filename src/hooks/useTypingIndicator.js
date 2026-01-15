'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook for managing typing indicators using Supabase Presence
 * 
 * @param {string} formId - The form ID for the chat
 * @param {string} department - The department name
 * @param {string} currentUserType - 'student' or 'department'
 * @param {string} currentUserName - Display name of current user
 */
export function useTypingIndicator(formId, department, currentUserType, currentUserName) {
    const [typingUsers, setTypingUsers] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const channelRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Set up presence channel
    useEffect(() => {
        if (!formId || !department) return;

        const channelName = `typing-${formId}-${department}`;

        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: `${currentUserType}-${currentUserName}`
                }
            }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users = [];

                for (const key in state) {
                    const presences = state[key];
                    presences.forEach(presence => {
                        // Only show typing indicator from the other party
                        if (presence.userType !== currentUserType && presence.isTyping) {
                            users.push({
                                name: presence.userName,
                                type: presence.userType
                            });
                        }
                    });
                }

                setTypingUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('User joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('User left:', key, leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track presence when subscribed
                    await channel.track({
                        userType: currentUserType,
                        userName: currentUserName,
                        isTyping: false,
                        online_at: new Date().toISOString()
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                channelRef.current.untrack();
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [formId, department, currentUserType, currentUserName]);

    // Broadcast typing state
    const startTyping = useCallback(() => {
        if (!channelRef.current) return;

        setIsTyping(true);

        // Update presence to show typing
        channelRef.current.track({
            userType: currentUserType,
            userName: currentUserName,
            isTyping: true,
            online_at: new Date().toISOString()
        });

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    }, [currentUserType, currentUserName]);

    const stopTyping = useCallback(() => {
        if (!channelRef.current) return;

        setIsTyping(false);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Update presence to stop typing
        channelRef.current.track({
            userType: currentUserType,
            userName: currentUserName,
            isTyping: false,
            online_at: new Date().toISOString()
        });
    }, [currentUserType, currentUserName]);

    return {
        typingUsers,
        isTyping,
        startTyping,
        stopTyping
    };
}
