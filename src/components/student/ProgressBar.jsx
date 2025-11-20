'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProgressBar({ current, total }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const percentage = Math.round((current / total) * 100);

  // Color based on progress
  const getColor = () => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-jecrc-red';
  };

  const getTextColor = () => {
    if (percentage === 100) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-jecrc-red';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-medium transition-colors duration-700 ease-smooth
          ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Progress
        </span>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {current}/{total} ({percentage}%)
        </span>
      </div>
      
      <div className={`h-3 rounded-full overflow-hidden transition-all duration-700 ease-smooth
        ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full ${getColor()} transition-colors duration-500`}
        />
      </div>
    </div>
  );
}