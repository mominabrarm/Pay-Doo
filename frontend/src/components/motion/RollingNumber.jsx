import React, { useRef, useState, useEffect } from "react";
import NumberFlow from "@number-flow/react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * RollingNumber component:
 * - Animates number rolling from 0 to value when scrolled into view (once).
 * - Accepts numbers (e.g. 1761) or formatted strings (e.g. "₹9,48,665", "0.42%").
 * - Parses prefix (e.g. ₹), suffix (e.g. %), and decimals automatically.
 * - Under 1.2s animation duration.
 * - Respects prefers-reduced-motion (shows final state immediately).
 */
export function RollingNumber({
  value,
  prefix: explicitPrefix = "",
  suffix: explicitSuffix = "",
  className = "",
  duration = 900,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const shouldReduceMotion = useReducedMotion();

  // Parse input if string (e.g. "₹9,48,665" -> prefix="₹", targetNum=948665)
  let prefix = explicitPrefix || "";
  let suffix = explicitSuffix || "";
  let targetNumber = 0;
  let fractionDigits = 0;

  if (typeof value === "number") {
    targetNumber = value;
    fractionDigits = Number.isInteger(value) ? 0 : 2;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("₹") && !explicitPrefix) {
      prefix = "₹";
    }
    if (trimmed.endsWith("%") && !explicitSuffix) {
      suffix = "%";
    }
    // Clean string to parse number
    const cleaned = trimmed.replace(/[₹%,\s]/g, "");
    targetNumber = parseFloat(cleaned) || 0;
    if (cleaned.includes(".")) {
      fractionDigits = cleaned.split(".")[1]?.length || 2;
    }
  }

  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? targetNumber : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(targetNumber);
      return;
    }

    if (isInView) {
      setDisplayValue(targetNumber);
    }
  }, [isInView, targetNumber, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <span className={className}>
        {prefix}
        {targetNumber.toLocaleString("en-IN", {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        })}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={`inline-flex items-baseline ${className}`}>
      {prefix && <span>{prefix}</span>}
      <NumberFlow
        value={displayValue}
        locales="en-IN"
        format={{
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        }}
        animated={!shouldReduceMotion}
        style={{
          "--number-flow-char-duration": `${Math.min(duration, 1100)}ms`,
        }}
      />
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

export default RollingNumber;
