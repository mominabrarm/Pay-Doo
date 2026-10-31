import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * Reveal component:
 * - Fade + 24px slide-up animation.
 * - Triggered once when entering viewport with margin -80px.
 * - Duration under 1.2s (default 0.7s, ease-out).
 * - Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  duration = 0.65,
  yOffset = 24,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: yOffset }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
