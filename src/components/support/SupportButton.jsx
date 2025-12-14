'use client';

import React, { useState } from 'react';
import { Headphones } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import StudentSupportModal from './StudentSupportModal';
import DepartmentSupportModal from './DepartmentSupportModal';
import AdminSupportModal from './AdminSupportModal';
import SupportModal from './SupportModal';

/**
 * SupportButton - Reusable floating support button with role detection
 * Automatically shows the appropriate support modal based on user role
 * Falls back to generic modal for unauthenticated users
 * 
 * @param {Object} props
 * @param {boolean} props.floating - Whether to display as floating button (default: true)
 * @param {string} props.variant - Button variant: 'floating' | 'inline' | 'header' (default: 'floating')
 * @param {string} props.className - Additional CSS classes
 */
export default function SupportButton({ 
  floating = true, 
  variant = 'floating',
  className = '' 
}) {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Determine which modal to show based on user role
  const renderModal = () => {
    if (!user || !profile) {
      // Unauthenticated or no profile - show generic modal
      return <SupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
    }

    // Role-based modal selection with proper fallback
    const role = profile.role?.toLowerCase();
    
    switch (role) {
      case 'admin':
        return <AdminSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
      
      case 'department':
      case 'hod':
      case 'registrar':
        return <DepartmentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
      
      case 'student':
        return <StudentSupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
      
      default:
        // Enhanced fallback: Log unknown role and use generic modal
        console.warn(`Unknown role "${role}" detected. Using generic support modal.`);
        return <SupportModal isOpen={showModal} onClose={() => setShowModal(false)} />;
    }
  };

  // Render button based on variant
  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
            bg-gradient-to-br from-jecrc-red to-jecrc-red-dark text-white
            hover:scale-110 active:scale-95 transition-all duration-300 z-40 group ${className}`}
          title="Need Support?"
          aria-label="Open support"
        >
          <Headphones className="w-6 h-6 group-hover:animate-pulse" />
        </button>
        {renderModal()}
      </>
    );
  }

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
            bg-gradient-to-r from-jecrc-red/10 to-jecrc-red-dark/10 
            hover:from-jecrc-red/20 hover:to-jecrc-red-dark/20
            border border-jecrc-red/20 hover:border-jecrc-red/40
            text-jecrc-red hover:text-jecrc-red-dark
            dark:text-jecrc-red dark:hover:text-white ${className}`}
          title="Need Support?"
          aria-label="Open support"
        >
          <Headphones className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Support</span>
        </button>
        {renderModal()}
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
            bg-jecrc-red hover:bg-jecrc-red-dark text-white
            shadow-lg shadow-jecrc-red/20 hover:shadow-xl hover:shadow-jecrc-red/30 ${className}`}
          aria-label="Open support"
        >
          <Headphones className="w-5 h-5" />
          <span className="font-medium">Get Support</span>
        </button>
        {renderModal()}
      </>
    );
  }

  // Default fallback
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
          bg-jecrc-red hover:bg-jecrc-red-dark text-white ${className}`}
        aria-label="Open support"
      >
        <Headphones className="w-5 h-5" />
        <span>Support</span>
      </button>
      {renderModal()}
    </>
  );
}