import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export function PasswordField({
  id = "password",
  label = "Password",
  value = "",
  onChange,
  placeholder = "Password",
  required = true,
  error = "",
  autoComplete = "current-password",
}) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-forest">
        {label}
      </label>

      <div className="relative">
        {/* Left Lock Icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
          <Lock className="w-4 h-4" />
        </div>

        {/* Tall Input with Teal Focus Ring */}
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full h-12 pl-10 pr-11 bg-white border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none ${
            error
              ? "border-error-red bg-error-red/5 focus:ring-2 focus:ring-error-red/20"
              : "border-input-border focus:border-teal focus:ring-2 focus:ring-teal/20"
          }`}
        />

        {/* Show/Hide Password Eye Button */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-body-muted hover:text-forest transition-colors duration-150 cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div id={errorId} aria-live="polite" className="flex items-center gap-1.5 pt-0.5 text-error-red">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

export default PasswordField;
