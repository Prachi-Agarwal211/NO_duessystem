'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({
    onSend,
    sending,
    placeholder,
    onTypingStart,
    onTypingStop
}) {
    const [message, setMessage] = useState('');
    const typingTimeoutRef = useRef(null);

    // Handle typing detection
    const handleChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        // Trigger typing start
        if (value.trim() && onTypingStart) {
            onTypingStart();
        }

        // Reset typing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
            if (onTypingStop) {
                onTypingStop();
            }
        }, 2000);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim() || sending) return;

        // Stop typing when sending
        if (onTypingStop) {
            onTypingStop();
        }

        onSend(message.trim());
        setMessage('');
    };

    const handleKeyDown = (e) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Handle blur - stop typing
    const handleBlur = () => {
        if (onTypingStop) {
            onTypingStop();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-2 items-end">
                <textarea
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={placeholder || 'Type a message...'}
                    rows={1}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 min-w-[44px] min-h-[44px]"
                    aria-label="Send message"
                >
                    {sending ? (
                        <span className="animate-spin text-lg">⟳</span>
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Press Enter to send, Shift+Enter for new line
            </p>
        </form>
    );
}
