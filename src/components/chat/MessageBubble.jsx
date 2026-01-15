'use client';

import { RefreshCw, Check, CheckCheck, AlertCircle } from 'lucide-react';

export default function MessageBubble({ message, isOwn, isSending, isFailed, onRetry }) {
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                {/* Sender Name */}
                <p className={`text-xs font-medium mb-1 ${isOwn
                    ? 'text-right text-blue-600 dark:text-blue-400'
                    : 'text-left text-gray-600 dark:text-gray-400'
                    }`}>
                    {message.sender_type === 'department' ? '🏢 ' : '👤 '}
                    {message.sender_name}
                </p>

                {/* Message Bubble */}
                <div className={`px-4 py-2.5 rounded-2xl relative ${isOwn
                    ? isFailed
                        ? 'bg-red-500 text-white rounded-br-md'
                        : isSending
                            ? 'bg-blue-400 text-white rounded-br-md'
                            : 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600'
                    }`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.message}
                    </p>

                    {/* Sending/Failed indicator */}
                    {isOwn && isSending && (
                        <div className="absolute -bottom-1 -right-1">
                            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Timestamp and Status */}
                <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[10px] text-gray-400">
                        {isSending ? 'Sending...' : formatTime(message.created_at)}
                    </p>

                    {/* Read receipt indicator for own messages */}
                    {isOwn && !isSending && !isFailed && (
                        <span className="text-gray-400">
                            {message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                        </span>
                    )}
                </div>

                {/* Failed message retry button */}
                {isFailed && onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                        <AlertCircle className="w-3 h-3" />
                        Failed to send.
                        <span className="underline">Tap to retry</span>
                    </button>
                )}
            </div>
        </div>
    );
}
