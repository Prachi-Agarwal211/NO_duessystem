'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function DataTable({ headers, data, className = '', onRowClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      <table className={`min-w-full ${className}`}>
        <thead>
          <tr className={`transition-colors duration-700 ${isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
            {headers.map((header, index) => (
              <th
                key={index}
                className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors duration-700 ${
                  isDark 
                    ? 'bg-gray-800 text-gray-300' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`transition-colors duration-700 ${isDark ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`transition-all duration-300 ${
                onRowClick ? 'cursor-pointer' : ''
              } ${
                isDark 
                  ? 'hover:bg-gray-800/50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                    isDark ? 'text-gray-300' : 'text-gray-900'
                  }`}
                >
                  {typeof row[header.toLowerCase().replace(' ', '_')] === 'object'
                    ? row[header.toLowerCase().replace(' ', '_')]
                    : row[header.toLowerCase().replace(' ', '_')]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}