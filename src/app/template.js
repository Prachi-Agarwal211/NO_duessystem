'use client';

import { motion } from 'framer-motion';

// Professional page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    filter: 'blur(8px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    filter: 'blur(8px)',
  },
};

const pageTransition = {
  duration: 0.4,
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
