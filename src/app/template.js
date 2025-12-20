'use client';

import { motion } from 'framer-motion';

// Optimized page transition variants (removed blur for performance)
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1], // Smooth cubic-bezier easing
};

export default function Template({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
