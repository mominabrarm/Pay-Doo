import React from "react";
import { Check, X } from "lucide-react";

export function RequirementList({ checks = {} }) {
  const requirements = [
    { key: "minLength", label: "More than 8 characters", met: !!checks.minLength },
    { key: "hasUpper", label: "One uppercase letter", met: !!checks.hasUpper },
    { key: "hasLower", label: "One lowercase letter", met: !!checks.hasLower },
    { key: "hasSpecial", label: "One special character", met: !!checks.hasSpecial },
  ];

  return (
    <div className="p-3 bg-mint/30 border border-input-border rounded-xl" aria-label="Password requirements">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {requirements.map((req) => (
          <div
            key={req.key}
            className={`flex items-center gap-1.5 transition-colors duration-150 ${
              req.met ? "text-forest font-semibold" : "text-body-muted"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150 ${
                req.met
                  ? "bg-success-green/15 text-success-green"
                  : "bg-input-border text-body-muted"
              }`}
            >
              {req.met ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                <X className="w-3 h-3 stroke-[2.5]" />
              )}
            </div>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RequirementList;
