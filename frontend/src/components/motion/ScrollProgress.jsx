import React from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * ScrollProgress component:
 * - A thin progress bar fixed at the very top of the page in primary green #1B3D35.
 * - Smooth spring physics.
 * - Hidden if prefers-reduced-motion is active.
 */
export function ScrollProgress({ color = "#1B3D35", height = 3 }) {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 origin-left z-[100] pointer-events-none"
      style={{
        scaleX,
        height: `${height}px`,
        backgroundColor: color,
        transformOrigin: "0%",
      }}
      aria-hidden="true"
    />
  );
}

export default ScrollProgress;
