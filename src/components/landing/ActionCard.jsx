'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ActionCard({ title, subtitle, icon: Icon, onClick, index }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 + index * 0.15, ease: "easeOut" }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        interactive group relative
        w-full md:w-[340px] h-[280px]
        overflow-hidden text-left p-8
        flex flex-col justify-between
        transition-all duration-700 ease-smooth
        border backdrop-blur-md rounded-xl
        ${isDark
          ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 shadow-neon-white hover:shadow-neon-white-lg hover:border-white/20'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 hover:from-white hover:via-gray-50 hover:to-white border-black/10 shadow-sharp-black hover:shadow-sharp-black-lg hover:border-black/15'
        }
      `}
    >
      {/* JECRC Red Accent Overlays */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-jecrc-red/10" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-jecrc-red to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-jecrc-red/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`
          relative w-14 h-14 mb-6
          flex items-center justify-center
          rounded-2xl
          transition-all duration-700 ease-smooth
          group-hover:scale-110 group-hover:rotate-3
          ${isDark
            ? 'bg-white/5 text-white group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-dark-red group-hover:shadow-neon-red'
            : 'bg-black/5 text-black group-hover:bg-gradient-to-br group-hover:from-jecrc-red group-hover:to-jecrc-dark-red group-hover:text-white group-hover:shadow-lg'
          }
        `}>
          {/* Icon glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Icon size={24} strokeWidth={1.5} className="relative z-10" />
        </div>
        
        <h2 className={`font-serif text-3xl mb-3 transition-colors duration-700 ease-smooth ${isDark ? 'text-white' : 'text-ink-black'}`}>
          {title}
        </h2>
        <p className={`font-sans text-sm font-medium leading-relaxed transition-colors duration-700 ease-smooth ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'}`}>
          {subtitle}
        </p>
      </div>

      <div className={`relative z-10 flex items-center gap-3 text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-700 ease-smooth
        ${isDark 
          ? 'text-gray-600 group-hover:text-white' 
          : 'text-gray-400 group-hover:text-jecrc-red'
        }`}>
        <span>Proceed</span>
        <ChevronRight size={14} className="transform group-hover:translate-x-1.5 transition-transform duration-300" />
      </div>
    </motion.button>
  );
}