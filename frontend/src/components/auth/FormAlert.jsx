import React from "react";
import { AlertCircle } from "lucide-react";

export function FormAlert({ message = "" }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-3.5 bg-error-red/10 border border-error-red/25 text-error-red rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors duration-150"
    >
      <AlertCircle className="w-4 h-4 shrink-0 text-error-red" />
      <span>{message}</span>
    </div>
  );
}

export default FormAlert;
