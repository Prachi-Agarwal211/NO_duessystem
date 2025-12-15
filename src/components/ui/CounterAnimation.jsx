'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';

/**
 * CounterAnimation Component
 * Animates numbers counting up from 0 to target value
 * Triggers when element comes into view
 */
export default function CounterAnimation({ 
  value, 
  duration = 2, 
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

/**
 * StatCard Component
 * Combines counter animation with icon and label
 */
export function StatCard({ icon: Icon, label, value, prefix = "", suffix = "", color = "red" }) {
  const colorClasses = {
    red: "text-jecrc-red dark:text-jecrc-red-bright",
    green: "text-success-light dark:text-success-dark",
    blue: "text-info-light dark:text-info-dark",
    yellow: "text-warning-light dark:text-warning-dark"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass p-6 rounded-xl hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 ${colorClasses[color]}`}>
            <Icon size={24} />
          </div>
        )}
        
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </div>
          <CounterAnimation
            value={value}
            prefix={prefix}
            suffix={suffix}
            className="text-3xl font-bold text-black dark:text-white"
          />
        </div>
      </div>
    </motion.div>
  );
}