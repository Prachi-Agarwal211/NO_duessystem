'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ActionCard({ title, subtitle, icon: Icon, onClick, index }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Spring physics configuration for bouncy feel
  const springConfig = {
    type: "spring",
    stiffness: 260,
    damping: 20
  };
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.7, 
        delay: 0.1 + index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        y: -12, 
        scale: 1.03,
        transition: springConfig
      }}
      whileTap={{ 
        scale: 0.97,
        transition: { duration: 0.1 }
      }}
      onClick={onClick}
      className={`
        interactive group relative
        w-full md:w-[340px] h-[280px]
        overflow-hidden text-left p-8
        flex flex-col justify-between
        transition-all duration-500 ease-spring
        border backdrop-blur-md rounded-xl
        ${isDark
          ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 shadow-neon-white hover:shadow-neon-white-lg hover:border-white/30'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 hover:from-white hover:via-gray-50 hover:to-white border-black/10 shadow-sharp-black hover:shadow-sharp-black-lg hover:border-black/20'
        }
      `}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      {/* Animated gradient overlays */}
      <motion.div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-jecrc-red/10"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      
      {/* Top accent line */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-jecrc-red to-transparent opacity-0 group-hover:opacity-100"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      
      {/* Corner glow */}
      <motion.div 
        className="absolute bottom-0 right-0 w-32 h-32 bg-jecrc-red/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100"
        initial={{ scale: 0.5, opacity: 0 }}
        whileHover={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        <motion.div 
          className={`
            relative w-14 h-14 mb-6
            flex items-center justify-center
            rounded-2xl
            transition-all duration-500 ease-spring
            ${isDark
              ? 'bg-white/5 text-white group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-red-dark group-hover:shadow-neon-red'
              : 'bg-black/5 text-black group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-red-dark group-hover:text-white group-hover:shadow-lg'
            }
          `}
          whileHover={{ 
            scale: 1.15, 
            rotate: 5,
            transition: springConfig
          }}
        >
          {/* Icon shimmer effect */}
          <motion.div 
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100"
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          <Icon size={24} strokeWidth={1.5} className="relative z-10" />
        </motion.div>
        
        <motion.h2 
          className={`font-serif text-3xl mb-3 transition-colors duration-500 ${isDark ? 'text-white' : 'text-ink-black'}`}
          whileHover={{ scale: 1.02 }}
          transition={springConfig}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className={`font-sans text-sm font-medium leading-relaxed transition-colors duration-500 ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'}`}
          whileHover={{ scale: 1.01 }}
          transition={springConfig}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* CTA with animated arrow */}
      <motion.div 
        className={`relative z-10 flex items-center gap-3 text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-500
          ${isDark 
            ? 'text-gray-600 group-hover:text-jecrc-red-bright' 
            : 'text-gray-400 group-hover:text-jecrc-red'
          }`}
        whileHover={{ x: 4 }}
        transition={springConfig}
      >
        <span>Proceed</span>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        >
          <ChevronRight size={14} />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}