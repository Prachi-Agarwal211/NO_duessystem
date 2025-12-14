'use client';

import React, { useState } from 'react';
import { Users, Building2, List } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import SupportTicketsTable from './SupportTicketsTable';

/**
 * TabbedSupportTickets - Enhanced support tickets view with role-based tabs
 * - Student Tickets Tab
 * - Department Tickets Tab
 * - All Tickets Tab
 */
export default function TabbedSupportTickets() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    {
      id: 'all',
      label: 'All Tickets',
      icon: List,
      filter: null
    },
    {
      id: 'student',
      label: 'Student Tickets',
      icon: Users,
      filter: 'student'
    },
    {
      id: 'department',
      label: 'Department Tickets',
      icon: Building2,
      filter: 'department'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Headers */}
      <div className={`flex flex-wrap gap-2 p-2 rounded-xl
        ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                ${isActive
                  ? isDark
                    ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20'
                    : 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/30'
                  : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content - Pass filter to table component */}
      <div className="animate-fade-in">
        <SupportTicketsTable 
          key={activeTab} 
          defaultRequesterTypeFilter={tabs.find(t => t.id === activeTab)?.filter || ''}
        />
      </div>
    </div>
  );
}