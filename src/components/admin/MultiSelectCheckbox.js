'use client';
import { useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function MultiSelectCheckbox({ 
  label, 
  options = [], 
  selectedIds = [], 
  onChange,
  placeholder = "Select items",
  emptyMessage = "No items available"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(filteredOptions.map(opt => opt.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedCount = selectedIds.length;
  const selectedLabels = options
    .filter(opt => selectedIds.includes(opt.id))
    .map(opt => opt.label);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        {label}
      </label>
      
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red focus:border-transparent flex items-center justify-between transition-all"
      >
        <span className="text-sm truncate">
          {selectedCount === 0 
            ? placeholder 
            : `${selectedCount} selected${selectedCount <= 2 ? `: ${selectedLabels.join(', ')}` : ''}`
          }
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl max-h-80 flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200 dark:border-white/10">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-jecrc-red"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={selectAll}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              Select All ({filteredOptions.length})
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {options.length === 0 ? emptyMessage : 'No matches found'}
              </div>
            ) : (
              <div className="p-2">
                {filteredOptions.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-jecrc-rose dark:bg-jecrc-red/20 text-jecrc-red dark:text-jecrc-red-bright' 
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-jecrc-red border-jecrc-red' 
                          : 'border-gray-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(option.id)}
                        className="sr-only"
                      />
                      <span className="text-sm flex-1">{option.label}</span>
                      {option.subtitle && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {option.subtitle}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-medium bg-jecrc-red text-white rounded-lg hover:bg-jecrc-red-dark transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}