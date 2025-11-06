import React from 'react';

export default function DataTable({ headers, data, className = '', onRowClick }) {
  return (
    <table className={`min-w-full ${className}`}>
      <thead>
        <tr className="border-b border-gray-700">
          {headers.map((header, index) => (
            <th
              key={index}
              className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-800 text-gray-300"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700">
        {data.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className={`hover:bg-gray-800/50 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick && onRowClick(row)}
          >
            {headers.map((header, cellIndex) => (
              <td
                key={cellIndex}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-300"
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
  );
}