'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ChevronUp, RefreshCw } from 'lucide-react';

export default function ChatBox({
    messages,
    loading,
    sending,
    error,
    onSend,
    onRetry,
    onLoadMore,
    hasMore,
    loadingMore,
    currentUserType, // 'student' | 'department'
    currentUserName,
    rejectionReason,
    departmentName,
    // Typing indicator props
    typingUsers = [],
    onTypingStart,
    onTypingStop
}) {
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                <div className="px-4 py-3 bg-gradient-to-r from-jecrc-red to-red-600 text-white">
                    <h3 className="font-bold text-lg">💬 Chat with {departmentName}</h3>
                    <p className="text-xs text-white/80">Loading messages...</p>
                </div>
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
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] bg-gray-50 dark:bg-gray-800/50"
            >
                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center mb-4">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Load older messages
                                </>
                            )}
                        </button>
                    </div>
                )}

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
                                isSending={msg.is_sending}
                                isFailed={msg.is_failed}
                                onRetry={onRetry ? () => onRetry(msg.id) : undefined}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span className="italic">
                            {typingUsers.length === 1
                                ? `${typingUsers[0].name} is typing...`
                                : `${typingUsers.map(u => u.name).join(', ')} are typing...`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
                    <span>⚠️ {error}</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs underline hover:no-underline"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {/* Input Area */}
            <ChatInput
                onSend={(message) => onSend(message, currentUserType, currentUserName)}
                sending={sending}
                placeholder={`Message ${departmentName}...`}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
            />
        </div>
    );
}
