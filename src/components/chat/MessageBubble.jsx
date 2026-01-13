'use client';

export default function MessageBubble({ message, isOwn }) {
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
                <div className={`px-4 py-2.5 rounded-2xl ${isOwn
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600'
                    }`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.message}
                    </p>
                </div>

                {/* Timestamp */}
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-right' : 'text-left'
                    } text-gray-400`}>
                    {formatTime(message.created_at)}
                </p>
            </div>
        </div>
    );
}
