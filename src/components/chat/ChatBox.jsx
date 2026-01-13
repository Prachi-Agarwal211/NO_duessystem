'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

export default function ChatBox({
    messages,
    loading,
    sending,
    error,
    onSend,
    currentUserType, // 'student' | 'department'
    currentUserName,
    rejectionReason,
    departmentName
}) {
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-jecrc-red to-red-600 text-white">
                <h3 className="font-bold text-lg">💬 Chat with {departmentName}</h3>
                <p className="text-xs text-white/80">Real-time communication</p>
            </div>

            {/* Rejection Reason Banner */}
            {rejectionReason && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                        Rejection Reason:
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                        {rejectionReason}
                    </p>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] bg-gray-50 dark:bg-gray-800/50">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                            <span className="text-2xl">💬</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                            Start the conversation to resolve your issue
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isOwn={msg.sender_type === currentUserType}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Input Area */}
            <ChatInput
                onSend={(message) => onSend(message, currentUserType, currentUserName)}
                sending={sending}
                placeholder={`Message ${departmentName}...`}
            />
        </div>
    );
}
