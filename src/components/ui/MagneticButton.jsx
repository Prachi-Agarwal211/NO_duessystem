'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * MagneticButton Component
 * Button that magnetically follows the cursor before clicking
 * Creates premium, playful interaction
 */
export default function MagneticButton({ 
  children, 
  className = "", 
  onClick,
  disabled = false,
  variant = "primary",
  ...props 
}) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (disabled) return;
    
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate distance from center
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    // Apply magnetic effect (max 15px movement)
    const magneticStrength = 0.3;
    setPosition({
      x: deltaX * magneticStrength,
      y: deltaY * magneticStrength
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const baseStyles = "relative inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white shadow-sharp-black-lg dark:shadow-neon-red-lg hover:shadow-neon-red-xl dark:hover:shadow-neon-red-xl",
    secondary: "border-2 border-black dark:border-white text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5",
    ghost: "text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {/* Ripple effect on click */}
      <span className="relative z-10">{children}</span>
      
      {/* Hover glow effect */}
      <motion.span
        className="absolute inset-0 rounded-lg opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          background: variant === 'primary' 
            ? 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(196,30,58,0.1) 0%, transparent 70%)'
        }}
      />
    </motion.button>
  );
}