'use client';

import React, { useState, useEffect } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { DepartmentStatusSummary, ExpandedDepartmentDetails } from './DepartmentStatusDisplay';
import { RefreshCw } from 'lucide-react';

export default function ApplicationsTable({ applications, currentPage, totalPages, totalItems, onPageChange }) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // FIX: Reset expanded rows when applications change to prevent memory leak
  useEffect(() => {
    setExpandedRows(new Set());
  }, [applications]);

  const toggleRowExpansion = (appId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden transition-all duration-700 bg-white/60 dark:bg-black/40 border-gray-200 dark:border-white/10 backdrop-blur-md shadow-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Expand</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Student Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reg. No</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Course</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overall Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dept. Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {applications.map((app) => {
              const isExpanded = expandedRows.has(app.id);
              return (
                <React.Fragment key={app.id}>
                  <tr className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRowExpansion(app.id)}
                        className="p-1.5 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white group-hover:text-jecrc-red dark:group-hover:text-jecrc-red-light transition-colors">
                      <div className="flex items-center gap-2">
                        {app.student_name}
                        {app.is_reapplication && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                            <RefreshCw className="w-3 h-3" />
                            Reapplied
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{app.registration_no}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{app.course || 'N/A'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={app.status} />
                        {app.reapplication_count > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({app.reapplication_count}x)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <DepartmentStatusSummary departmentStatuses={app.no_dues_status || []} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => window.location.href = `/admin/request/${app.id}`}
                        className="text-jecrc-red hover:text-red-700 dark:hover:text-red-400 font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="8" className="px-4 py-4 bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                        <div className="animate-fade-in">
                          <ExpandedDepartmentDetails departments={app.no_dues_status} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-200 dark:border-white/10 gap-3 bg-gray-50/30 dark:bg-white/5">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Page <span className="font-medium text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}