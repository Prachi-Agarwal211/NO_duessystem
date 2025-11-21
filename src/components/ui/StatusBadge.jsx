import React from 'react';

function StatusBadge({ status, className = "" }) {
  const statusColors = {
    pending: 'bg-yellow-600/70',
    approved: 'bg-green-600/70',
    rejected: 'bg-red-600/70',
    'in_progress': 'bg-blue-600/70',
    completed: 'bg-purple-600/70',
    'screenshot_uploaded': 'bg-orange-600/70',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status] || 'bg-gray-600/70'} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
}

// Memoize to prevent unnecessary re-renders
export default React.memo(StatusBadge);