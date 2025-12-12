'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Trash2, Check, X, Archive, Edit } from 'lucide-react';

/**
 * SwipeableRow Component
 * 
 * Table row with swipe gestures to reveal action buttons (mobile).
 * Features:
 * - Swipe left/right to reveal actions
 * - Configurable action buttons
 * - Haptic feedback on action trigger
 * - Automatic snap back
 * - Touch-optimized
 * - Works on mobile and desktop
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Row content
 * @param {Array} props.leftActions - Actions on left swipe (max 2)
 * @param {Array} props.rightActions - Actions on right swipe (max 2)
 * @param {number} props.threshold - Swipe threshold to show actions (default: 80)
 * @param {boolean} props.disabled - Disable swipe
 * @param {Function} props.onSwipe - Callback when action is triggered
 * @param {string} props.className - Additional CSS classes
 */
export default function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  disabled = false,
  onSwipe = () => {},
  className = ''
}) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState(null); // 'left' or 'right'
  const constraintsRef = useRef(null);
  
  // Calculate max swipe distance based on number of actions
  const maxLeftSwipe = leftActions.length * 80;
  const maxRightSwipe = rightActions.length * 80;
  
  // Transform x to background color (visual feedback)
  const backgroundColor = useTransform(
    x,
    [-maxRightSwipe, 0, maxLeftSwipe],
    ['rgba(239, 68, 68, 0.1)', 'transparent', 'rgba(34, 197, 94, 0.1)']
  );
  
  // Handle drag end
  const handleDragEnd = (event, info) => {
    const { offset, velocity } = info;
    
    // Check if dragged past threshold
    if (Math.abs(offset.x) > threshold) {
      // Determine direction
      const direction = offset.x > 0 ? 'right' : 'left';
      const snapDistance = direction === 'right' ? maxLeftSwipe : -maxRightSwipe;
      
      // Snap to open position
      animate(x, snapDistance, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
      
      setIsOpen(true);
      setOpenDirection(direction);
    } else {
      // Snap back to closed
      animate(x, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
      
      setIsOpen(false);
      setOpenDirection(null);
    }
  };
  
  // Handle action click
  const handleActionClick = (action) => {
    // Trigger haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // Execute action
    action.onClick();
    onSwipe(action);
    
    // Close row
    animate(x, 0, {
      type: 'spring',
      stiffness: 300,
      damping: 30
    });
    
    setIsOpen(false);
    setOpenDirection(null);
  };
  
  // Default action icons
  const iconMap = {
    delete: Trash2,
    approve: Check,
    reject: X,
    archive: Archive,
    edit: Edit
  };
  
  return (
    <div className={`relative overflow-hidden ${className}`} ref={constraintsRef}>
      {/* Left Actions (visible when swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, index) => {
            const Icon = action.icon || iconMap[action.type] || Edit;
            return (
              <motion.button
                key={index}
                onClick={() => handleActionClick(action)}
                className={`w-20 flex items-center justify-center ${action.color || 'bg-green-500'} text-white`}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isOpen && openDirection === 'right' ? 1 : 0,
                  x: isOpen && openDirection === 'right' ? 0 : -20
                }}
                transition={{ delay: index * 0.05 }}
              >
                <Icon className="w-5 h-5" />
              </motion.button>
            );
          })}
        </div>
      )}
      
      {/* Right Actions (visible when swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, index) => {
            const Icon = action.icon || iconMap[action.type] || Edit;
            return (
              <motion.button
                key={index}
                onClick={() => handleActionClick(action)}
                className={`w-20 flex items-center justify-center ${action.color || 'bg-red-500'} text-white`}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: isOpen && openDirection === 'left' ? 1 : 0,
                  x: isOpen && openDirection === 'left' ? 0 : 20
                }}
                transition={{ delay: index * 0.05 }}
              >
                <Icon className="w-5 h-5" />
              </motion.button>
            );
          })}
        </div>
      )}
      
      {/* Swipeable Content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{
          left: -maxRightSwipe,
          right: maxLeftSwipe
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, backgroundColor }}
        className="relative cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * SwipeActions Component
 * 
 * Pre-configured swipe actions for common use cases.
 */
export const SwipeActions = {
  /**
   * Approve action (green, left swipe)
   */
  approve: (onClick) => ({
    type: 'approve',
    icon: Check,
    color: 'bg-green-500',
    onClick
  }),
  
  /**
   * Reject action (red, left swipe)
   */
  reject: (onClick) => ({
    type: 'reject',
    icon: X,
    color: 'bg-red-500',
    onClick
  }),
  
  /**
   * Delete action (red, left swipe)
   */
  delete: (onClick) => ({
    type: 'delete',
    icon: Trash2,
    color: 'bg-red-600',
    onClick
  }),
  
  /**
   * Archive action (gray, right swipe)
   */
  archive: (onClick) => ({
    type: 'archive',
    icon: Archive,
    color: 'bg-gray-500',
    onClick
  }),
  
  /**
   * Edit action (blue, right swipe)
   */
  edit: (onClick) => ({
    type: 'edit',
    icon: Edit,
    color: 'bg-blue-500',
    onClick
  })
};

/**
 * useSwipeGesture Hook
 * 
 * Headless hook for implementing custom swipe gestures.
 * Provides all the logic without any UI components.
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Swipe state and handlers
 */
export function useSwipeGesture(options = {}) {
  const {
    threshold = 80,
    onSwipeLeft = () => {},
    onSwipeRight = () => {},
    disabled = false
  } = options;
  
  const [direction, setDirection] = useState(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  
  const handleStart = (clientX) => {
    if (disabled) return;
    startX.current = clientX;
    currentX.current = clientX;
    isDragging.current = true;
    setDirection(null);
  };
  
  const handleMove = (clientX) => {
    if (!isDragging.current || disabled) return;
    currentX.current = clientX;
    
    const deltaX = clientX - startX.current;
    if (Math.abs(deltaX) > 10) {
      setDirection(deltaX > 0 ? 'right' : 'left');
    }
  };
  
  const handleEnd = () => {
    if (!isDragging.current) return;
    
    const deltaX = currentX.current - startX.current;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }
    
    isDragging.current = false;
    setDirection(null);
  };
  
  return {
    direction,
    handlers: {
      onTouchStart: (e) => handleStart(e.touches[0].clientX),
      onTouchMove: (e) => handleMove(e.touches[0].clientX),
      onTouchEnd: handleEnd,
      onMouseDown: (e) => handleStart(e.clientX),
      onMouseMove: (e) => handleMove(e.clientX),
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd
    }
  };
}

/**
 * Example Usage:
 * 
 * ```jsx
 * <SwipeableRow
 *   leftActions={[
 *     SwipeActions.approve(() => handleApprove(row.id)),
 *     SwipeActions.edit(() => handleEdit(row.id))
 *   ]}
 *   rightActions={[
 *     SwipeActions.reject(() => handleReject(row.id)),
 *     SwipeActions.delete(() => handleDelete(row.id))
 *   ]}
 * >
 *   <div className="p-4">
 *     Row content here
 *   </div>
 * </SwipeableRow>
 * ```
 */