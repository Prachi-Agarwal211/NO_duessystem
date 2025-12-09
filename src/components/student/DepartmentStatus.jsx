'use client';

import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

function DepartmentStatus({ departmentName, status, actionAt, rejectionReason }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider";
    
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-500/20 text-green-500`;
      case 'rejected':
        return `${baseClasses} bg-red-500/20 text-red-500`;
      case 'in_progress':
        return `${baseClasses} bg-blue-500/20 text-blue-500`;
      default:
        return `${baseClasses} bg-yellow-500/20 text-yellow-500`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg transition-all duration-700 ease-smooth border
      ${isDark 
        ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10' 
        : 'bg-white hover:bg-gray-50 border-black/5'
      }`}>
      <div className="flex items-center gap-4 flex-1">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium truncate transition-colors duration-700 ease-smooth
            ${isDark ? 'text-white' : 'text-ink-black'}`}>
            {departmentName}
          </h4>
          {status === 'rejected' && rejectionReason && (
            <p className="text-xs text-red-500 mt-1 line-clamp-2">
              {rejectionReason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className={getStatusBadge()}>
          {status || 'pending'}
        </span>
        <span className={`text-xs whitespace-nowrap transition-colors duration-700 ease-smooth
          ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {formatDate(actionAt)}
        </span>
      </div>
    </div>
  );
}

// Memoize for performance (safe for real-time - props change triggers update)
export default React.memo(DepartmentStatus, (prevProps, nextProps) => {
  return (
    prevProps.departmentName === nextProps.departmentName &&
    prevProps.status === nextProps.status &&
    prevProps.actionAt === nextProps.actionAt &&
    prevProps.rejectionReason === nextProps.rejectionReason
  );
});