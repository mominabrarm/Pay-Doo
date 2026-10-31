import React from "react";
import { Check } from "lucide-react";

export function Stepper({ currentStep = 1, steps = ["Account", "Business", "Done"] }) {
  return (
    <nav aria-label="Progress" className="w-full pb-4">
      <ol className="flex items-center justify-between relative list-none m-0 p-0">
        {/* Continuous Connecting Line Behind Steps */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-input-border -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-forest transition-all duration-150 -z-0"
          style={{
            width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
          }}
        />

        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <li key={label} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-150 ${
                  isCompleted
                    ? "bg-forest text-white"
                    : isActive
                    ? "bg-forest text-white ring-4 ring-forest/15"
                    : "bg-white text-body-muted border border-input-border"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : stepNumber}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-forest font-bold"
                    : isCompleted
                    ? "text-forest"
                    : "text-body-muted"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
