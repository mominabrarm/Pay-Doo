import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { FormAlert } from "../../components/auth/FormAlert";
import { getDefaultRouteForRole } from "../../config/app.config";
import { api } from "../../api/paydoo";
import { setAuthSession, ApiError } from "../../api/client";

const DEMO_ACCOUNTS = {
  admin: {
    label: "Administrator (admin@brightloop.com)",
    email: "admin@brightloop.com",
    password: "Admin@Brightloop2026!",
    roleName: "Administrator",
  },
  staff: {
    label: "Staff Member (staff@brightloop.com)",
    email: "staff@brightloop.com",
    password: "StaffPassword123!",
    roleName: "Staff Member",
  },
  customer: {
    label: "Customer Portal (billing@nexusinfotech.com)",
    email: "billing@nexusinfotech.com",
    password: "CustomerPass123!",
    roleName: "Customer",
  },
  custom: {
    label: "Standard / Custom Account (Enter credentials manually)",
    email: "",
    password: "",
    roleName: "Custom User",
  },
};

export function LoginPage() {
  const navigate = useNavigate();

  // Selected demo shortcut state (default to admin for evaluation ease)
  const [selectedDemoRole, setSelectedDemoRole] = useState("admin");
  const [email, setEmail] = useState(DEMO_ACCOUNTS.admin.email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS.admin.password);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoRoleChange = (roleKey) => {
    setSelectedDemoRole(roleKey);
    setError("");
    const demo = DEMO_ACCOUNTS[roleKey];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Authoritative backend login: returns real JWT token and authenticated user payload
      const tokenData = await api.login({
        email: email.trim(),
        password: password,
      });

      // Securely store token and verified user session
      setAuthSession(tokenData.access_token, tokenData.user);

      // Route based on authoritative backend user role (admin, staff, customer)
      const targetRoute = getDefaultRouteForRole(tokenData.user.role);
      navigate(targetRoute || "/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Invalid email or password.");
      } else {
        setError("Unable to authenticate. Please check your network connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-forest">
            Welcome back!
          </h1>
          <p className="text-sm text-body-muted leading-relaxed">
            Manage your subscriptions, payments, and invoices — all in one place.
          </p>
        </div>

        {/* Error Banner */}
        {error && <FormAlert message={error} />}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Demo Account Quick-Fill Shortcut */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="demo-role-select"
                className="block text-xs font-semibold text-forest flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                <span>Demo Account Quick-Fill</span>
              </label>
              <span className="text-[10px] font-medium text-body-muted bg-mint/50 px-2 py-0.5 rounded-full">
                Optional Shortcut
              </span>
            </div>
            <select
              id="demo-role-select"
              value={selectedDemoRole}
              onChange={(e) => handleDemoRoleChange(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-input-border rounded-xl text-xs sm:text-sm text-forest font-medium outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-colors duration-150"
            >
              <option value="admin">Administrator (admin@brightloop.com)</option>
              <option value="staff">Staff Member (staff@brightloop.com)</option>
              <option value="customer">Customer Portal (billing@nexusinfotech.com)</option>
              <option value="custom">Standard / Custom Account (Enter credentials manually)</option>
            </select>
            <p className="text-[11px] text-body-muted leading-tight">
              Pre-fills verified credentials. Real permissions are authoritative and strictly verified by the backend.
            </p>
          </div>

          {/* Email Field */}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedDemoRole("custom");
                }}
                placeholder="name@company.com"
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
            onChange={(e) => {
              setPassword(e.target.value);
              setSelectedDemoRole("custom");
            }}
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

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 mt-2 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 shadow-sm transition-colors duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{isSubmitting ? "Authenticating..." : "Login"}</span>
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
