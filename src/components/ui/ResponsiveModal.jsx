import React from 'react';
import { createPortal } from 'react-dom';

const ResponsiveModal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  // Size classes for different modal sizes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden`}>
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ResponsiveModal;