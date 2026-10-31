import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * ShutterText component:
 * - Splits text into words wrapped in overflow-hidden containers.
 * - Each word has a primary green (#1B3D35) shutter mask that wipes upward (translateY: -100%)
 *   with a 0.08s stagger per word and ~0.9s total duration.
 * - Text slides up slightly as the shutter opens.
 * - Plays once (on load or when in view).
 * - Full original text kept in DOM via aria-label for accessibility & SEO.
 * - Supports onComplete callback to sequence subtitles/buttons.
 * - Respects prefers-reduced-motion.
 */
export function ShutterText({
  text,
  className = "",
  as: Component = "h2",
  trigger = "inView", // "load" | "inView"
  onComplete,
  stagger = 0.08,
  duration = 0.85,
  shutterColor = "#1B3D35",
}) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-60px" });
  const shouldReduceMotion = useReducedMotion();

  const words = text.split(" ");
  const isTriggered = trigger === "load" ? true : isInView;

  if (shouldReduceMotion) {
    return (
      <Component className={className}>
        {text}
      </Component>
    );
  }

  // Animation variants for the word text (slides up slightly into view)
  const wordVariants = {
    hidden: { y: "40%", opacity: 0 },
    visible: (i) => ({
      y: "0%",
      opacity: 1,
      transition: {
        duration: duration * 0.7,
        delay: i * stagger + 0.15,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  // Animation variants for the mask shutter (wipes away upward)
  const shutterVariants = {
    hidden: { y: "0%" },
    visible: (i) => ({
      y: "-102%",
      transition: {
        duration: duration,
        delay: i * stagger,
        ease: [0.76, 0, 0.24, 1],
      },
    }),
  };

  const handleAnimationComplete = (index) => {
    if (index === words.length - 1 && onComplete) {
      onComplete();
    }
  };

  return (
    <Component
      ref={containerRef}
      className={className}
      aria-label={text}
    >
      <span className="inline">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            aria-hidden="true"
            className="inline-block overflow-hidden relative align-top mr-[0.28em] py-0.5 leading-tight"
          >
            {/* The Word Text */}
            <motion.span
              custom={i}
              initial="hidden"
              animate={isTriggered ? "visible" : "hidden"}
              variants={wordVariants}
              className="inline-block"
            >
              {word}
            </motion.span>

            {/* The Shutter Mask Panel (Wiping upward) */}
            <motion.span
              custom={i}
              initial="hidden"
              animate={isTriggered ? "visible" : "hidden"}
              variants={shutterVariants}
              onAnimationComplete={() => handleAnimationComplete(i)}
              className="absolute inset-0 pointer-events-none z-10 block"
              style={{ backgroundColor: shutterColor }}
            />
          </span>
        ))}
      </span>
    </Component>
  );
}

export default ShutterText;
