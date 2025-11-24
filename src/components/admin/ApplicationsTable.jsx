'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import StatusBadge from '@/components/ui/StatusBadge';
import { DepartmentStatusSummary, ExpandedDepartmentDetails } from './DepartmentStatusDisplay';

export default function ApplicationsTable({ applications, currentPage, totalPages, totalItems, onPageChange }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expandedRows, setExpandedRows] = useState(new Set());

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
    <div className={`rounded-xl border overflow-hidden backdrop-blur-sm transition-all duration-700 ${
      isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Expand</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Student Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Reg. No</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Course</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Overall Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Dept. Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {applications.map((app) => {
              const isExpanded = expandedRows.has(app.id);
              return (
                <React.Fragment key={app.id}>
                  <tr className={isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRowExpansion(app.id)}
                        className={`p-1 rounded transition-colors ${
                          isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">{app.student_name}</td>
                    <td className="px-4 py-4 text-sm">{app.registration_no}</td>
                    <td className="px-4 py-4 text-sm">{app.course || 'N/A'}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-4">
                      <DepartmentStatusSummary departmentStatuses={app.no_dues_status || []} />
                    </td>
                    <td className="px-4 py-4 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => window.location.href = `/admin/request/${app.id}`}
                        className="text-jecrc-red hover:underline font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="8" className={`px-4 py-4 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                        <ExpandedDepartmentDetails departments={app.no_dues_status} />
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
      <div className={`flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3 transition-colors duration-700 ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className={`text-sm transition-colors duration-700 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}