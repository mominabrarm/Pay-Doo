import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight } from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { FormAlert } from "../../components/auth/FormAlert";
import { getDefaultRouteForRole } from "../../config/app.config";
import { getStoredUser, setAuthSession } from "../../api/client";

export function LoginPage() {
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState("arjun@hyperscale.io");
  const [password, setPassword] = useState("supersecretpwd");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Invalid email or password");
      return;
    }

    if (password.trim().length < 6) {
      setError("Invalid email or password");
      return;
    }

    setIsSubmitting(true);

    // Existing role-based redirect preservation:
    const storedUser = getStoredUser();
    const role = storedUser?.role || "admin";

    // Set active auth session
    setAuthSession("paydoo_auth_token", {
      id: "usr_active",
      email: email.trim(),
      name: email.split("@")[0].replace(".", " "),
      role: role,
    });

    const targetRoute = getDefaultRouteForRole(role);
    navigate(targetRoute || "/dashboard");
  };

  return (
    <AuthLayout mode="login">
      <div className="space-y-6">
        {/* Header matching provided mockup */}
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-forest">
            Welcome back!
          </h1>
          <p className="text-sm text-body-muted leading-relaxed">
            Manage your subscriptions, payments and invoices — all in one place.
          </p>
        </div>

        {/* Error Banner: e.g. "Invalid email or password" */}
        {error && <FormAlert message={error} />}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Work Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-forest"
            >
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-body-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="w-full h-12 pl-10 pr-4 bg-white border border-input-border rounded-xl text-sm text-forest placeholder:text-body-muted/60 transition-colors duration-150 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>
          </div>

          {/* Password with Show/Hide Toggle */}
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
          />

          {/* Forgot Password Right-Aligned Link */}
          <div className="flex justify-end pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-teal hover:underline transition-colors duration-150"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Primary Button: Forest Green full-width pill with Arrow */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 mt-2 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer disabled:opacity-70"
          >
            <span>{isSubmitting ? "Logging in..." : "Login"}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>

        {/* Footer: Register now */}
        <div className="pt-4 text-center">
          <p className="text-xs sm:text-sm text-body-muted">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-teal hover:underline font-bold transition-colors duration-150"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
