/**
 * SLA Helper - Calculate pending duration and SLA status
 */

/**
 * Calculate hours since a date
 */
export function getHoursSince(dateString) {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    return diffMs / (1000 * 60 * 60);
}

/**
 * Get SLA status based on pending hours
 * 
 * Returns:
 * - { level: 'normal', color: 'gray', label: 'Normal' } - < 24h
 * - { level: 'warning', color: 'yellow', label: 'Warning' } - 24-48h
 * - { level: 'slow', color: 'orange', label: 'Slow' } - 48h-5d
 * - { level: 'critical', color: 'red', label: 'Critical' } - > 5d
 */
export function getSLAStatus(submittedAt) {
    const hours = getHoursSince(submittedAt);

    if (hours < 24) {
        return {
            level: 'normal',
            color: 'gray',
            label: 'Normal',
            hours: Math.round(hours),
            text: `${Math.round(hours)}h ago`
        };
    }

    if (hours < 48) {
        return {
            level: 'warning',
            color: 'yellow',
            label: 'Warning',
            hours: Math.round(hours),
            text: `${Math.round(hours)}h ago - Response needed`
        };
    }

    const days = hours / 24;

    if (days < 5) {
        return {
            level: 'slow',
            color: 'orange',
            label: 'Slow',
            hours: Math.round(hours),
            days: Math.round(days),
            text: `${Math.round(days)} days - Needs attention`
        };
    }

    return {
        level: 'critical',
        color: 'red',
        label: 'Critical',
        hours: Math.round(hours),
        days: Math.round(days),
        text: `${Math.round(days)} days - Urgent!`
    };
}

/**
 * Get SLA badge CSS classes (Tailwind)
 */
export function getSLABadgeClasses(slaStatus, isDark = false) {
    const baseClasses = 'px-2 py-0.5 rounded-full text-xs font-medium';

    switch (slaStatus.level) {
        case 'warning':
            return `${baseClasses} ${isDark
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`;
        case 'slow':
            return `${baseClasses} ${isDark
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-orange-100 text-orange-700 border border-orange-300'}`;
        case 'critical':
            return `${baseClasses} ${isDark
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                : 'bg-red-100 text-red-700 border border-red-300 animate-pulse'}`;
        default:
            return `${baseClasses} ${isDark
                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                : 'bg-gray-100 text-gray-600 border border-gray-200'}`;
    }
}
