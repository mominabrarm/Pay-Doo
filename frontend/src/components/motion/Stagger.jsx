import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * Stagger Container component for card grids:
 * - Triggers children staggered animation once in view (margin: -80px).
 * - Respects prefers-reduced-motion.
 */
export function Stagger({
  children,
  className = "",
  staggerDelay = 0.1,
  delayChildren = 0.1,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem component:
 * - Fade + 24px slide-up.
 * - Optional hover lift: translateY(-4px) with soft shadow on hover (150ms transition).
 */
export function StaggerItem({
  children,
  className = "",
  hoverLift = true,
}) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={itemVariants}
      whileHover={
        hoverLift
          ? {
              y: -4,
              boxShadow: "0 12px 30px -4px rgba(27, 61, 53, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)",
              transition: { duration: 0.15, ease: "easeOut" },
            }
          : undefined
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Stagger;
