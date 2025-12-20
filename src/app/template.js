'use client';

import { motion } from 'framer-motion';

// Optimized page transition variants with stagger support
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.05, // Stagger child animations by 50ms
      delayChildren: 0.1,    // Start children after 100ms
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
    }
  },
};

/**
 * Template component with staggered page transitions
 * Provides smooth, professional entrance animations for route changes
 */
export default function Template({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
