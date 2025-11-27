'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Reusable table component for displaying configuration items
 * Follows the glass morphism design with action buttons
 */
export default function ConfigTable({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onToggleStatus,
  isLoading = false,
  emptyMessage = "No data available"
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name || item.display_name}"?`)) {
      return;
    }
    
    setDeletingId(item.id);
    try {
      await onDelete(item.id);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (item) => {
    setTogglingId(item.id);
    try {
      await onToggleStatus(item.id, !item.is_active);
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className={`transition-colors duration-700 ${
          isDark ? 'text-white/50' : 'text-gray-500'
        }`}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const renderCellValue = (item, column) => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item);
    }

    if (column.type === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      );
    }

    if (column.type === 'email') {
      return (
        <a 
          href={`mailto:${value}`} 
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {value}
        </a>
      );
    }

    return value || '-';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`border-b transition-colors duration-700 ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            {columns.map(column => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-medium transition-colors duration-700 ${
                  isDark ? 'text-white/80' : 'text-gray-700'
                }`}
              >
                {column.label}
              </th>
            ))}
            <th className={`px-4 py-3 text-right text-sm font-medium transition-colors duration-700 ${
              isDark ? 'text-white/80' : 'text-gray-700'
            }`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id}
              className={`border-b transition-colors duration-700 ${
                isDark
                  ? 'border-white/5 hover:bg-white/5'
                  : 'border-gray-100 hover:bg-gray-50'
              } ${!item.is_active ? 'opacity-60' : ''}`}
            >
              {columns.map(column => (
                <td
                  key={`${item.id}-${column.key}`}
                  className={`px-4 py-3 text-sm transition-colors duration-700 ${
                    isDark ? 'text-white/90' : 'text-gray-900'
                  }`}
                >
                  {renderCellValue(item, column)}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Toggle Status Button */}
                  {onToggleStatus && (
                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={togglingId === item.id}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        item.is_active
                          ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      } disabled:opacity-50`}
                      title={item.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {togglingId === item.id ? '...' : item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}

                  {/* Edit Button */}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs 
                               font-medium hover:bg-blue-500/30 transition-colors"
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}

                  {/* Delete Button */}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs 
                               font-medium hover:bg-red-500/30 transition-colors 
                               disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === item.id ? '...' : 'Delete'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}