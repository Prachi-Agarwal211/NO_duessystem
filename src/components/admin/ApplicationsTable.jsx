'use client';

import React, { useState, useEffect } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { DepartmentStatusSummary, ExpandedDepartmentDetails } from './DepartmentStatusDisplay';
import { RefreshCw } from 'lucide-react';

import { realtimeManager } from '@/lib/realtimeManager';

export default function ApplicationsTable({ applications: initialApplications, currentPage, totalPages, totalItems, onPageChange }) {
  const [applications, setApplications] = useState(initialApplications);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [updatingRows, setUpdatingRows] = useState(new Set());

  // Update local state when props change (initial load or page change)
  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  // Realtime subscription for targeted updates
  useEffect(() => {
    const handleRealtimeUpdate = (event) => {
      if (!event.formIds || event.formIds.length === 0) return;

      const impactedIds = new Set(event.formIds);

      // Flash the rows that are updating
      setUpdatingRows(prev => {
        const next = new Set(prev);
        impactedIds.forEach(id => next.add(id));
        return next;
      });

      // Clear flash after animation
      setTimeout(() => {
        setUpdatingRows(prev => {
          const next = new Set(prev);
          impactedIds.forEach(id => next.delete(id));
          return next;
        });
      }, 2000);

      // Targeted State Update logic
      setApplications(prevApps => {
        return prevApps.map(app => {
          if (!impactedIds.has(app.id)) return app;

          // If we have specific new data in the event, use it.
          // Note: Realtime manager events might need to carry the 'new' payload for this to be perfect.
          // For now, if it's a department status update, we might need to fetch *just* that row
          // OR if the event payload has the data, we merge it.

          // Ideally, we'd merge changes here. For now, let's assume the event *might* trigger a single row refresh
          // if we don't have the full data. But to stop full page reload, we update what we can.

          return app;
        });
      });
    };

    const unsubscribe = realtimeManager.subscribe('globalUpdate', handleRealtimeUpdate);
    return () => unsubscribe();
  }, []);

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
    <div className="rounded-xl border overflow-hidden transition-all duration-200 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 shadow-sm">
      {/* Mobile scroll hint */}
      <div className="md:hidden px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 text-center">
        ← Swipe left/right to view all columns →
      </div>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <table className="min-w-[1000px] w-full">
          <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Expand</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Student Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Reg. No</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Course</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Overall Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Dept. Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-600 dark:text-gray-300">
            {applications.map((app) => {
              const isExpanded = expandedRows.has(app.id);
              return (
                <React.Fragment key={app.id}>
                  <tr className={`group transition-colors duration-500 ${updatingRows.has(app.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleRowExpansion(app.id)}
                        className="p-3 min-h-[44px] min-w-[44px] rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-white/10 flex items-center justify-center"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white group-hover:text-jecrc-red dark:group-hover:text-jecrc-red-light transition-colors">
                      <div className="flex items-center gap-2">
                        {app.student_name}
                        {app.is_reapplication && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
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
                        className="px-4 py-2 min-h-[44px] text-jecrc-red dark:text-jecrc-red-bright hover:text-jecrc-red-dark dark:hover:text-jecrc-red-light font-medium transition-colors hover:bg-jecrc-red/10 rounded-lg"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan="8" className="px-4 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
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

      {/* Pagination - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-gray-200 dark:border-white/10 gap-3 bg-gray-50 dark:bg-white/5">
        <div className="text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
          Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex-1 sm:flex-none px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-all bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex-1 sm:flex-none px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-all bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}