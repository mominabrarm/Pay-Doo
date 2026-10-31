import React from "react";

/**
 * 4-segment strength meter using design tokens:
 * - Gray until user types (bg-input-border)
 * - Weak (1): Red (bg-error-red)
 * - Fair (2): Amber (bg-amber-500)
 * - Good (3): Green (bg-success-green)
 * - Strong (4): Forest Green (bg-forest)
 * - Accessible aria-live status, zero hard-coded hex values
 */
export function StrengthMeter({ password = "", checks = {} }) {
  if (!password) {
    return (
      <div className="space-y-1.5 pt-1" aria-hidden="true">
        <div className="flex items-center justify-between text-xs">
          <span className="text-body-muted font-medium">Password strength</span>
          <span className="text-body-muted/60 font-medium">—</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="h-1.5 rounded-full bg-input-border transition-colors duration-150" />
          <div className="h-1.5 rounded-full bg-input-border transition-colors duration-150" />
          <div className="h-1.5 rounded-full bg-input-border transition-colors duration-150" />
          <div className="h-1.5 rounded-full bg-input-border transition-colors duration-150" />
        </div>
      </div>
    );
  }

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.hasUpper) score += 1;
  if (checks.hasLower) score += 1;
  if (checks.hasSpecial) score += 1;

  let label = "Weak";
  let activeBg = "bg-error-red";
  let labelColor = "text-error-red";

  if (score === 2) {
    label = "Fair";
    activeBg = "bg-amber-500";
    labelColor = "text-amber-600";
  } else if (score === 3) {
    label = "Good";
    activeBg = "bg-success-green";
    labelColor = "text-success-green";
  } else if (score === 4) {
    label = "Strong";
    activeBg = "bg-forest";
    labelColor = "text-forest";
  }

  return (
    <div className="space-y-1.5 pt-1" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-body-muted font-medium">Password strength</span>
        <span className={`font-bold transition-colors duration-150 ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <div
          className={`h-1.5 rounded-full transition-colors duration-150 ${
            score >= 1 ? activeBg : "bg-input-border"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-colors duration-150 ${
            score >= 2 ? activeBg : "bg-input-border"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-colors duration-150 ${
            score >= 3 ? activeBg : "bg-input-border"
          }`}
        />
        <div
          className={`h-1.5 rounded-full transition-colors duration-150 ${
            score >= 4 ? activeBg : "bg-input-border"
          }`}
        />
      </div>
    </div>
  );
}

export default StrengthMeter;
