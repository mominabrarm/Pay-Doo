import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validatePassword, isEmailRegistered } from "../../utils/validators";
import { getDefaultRouteForRole } from "../../config/app.config";
import { FadeIn } from "../../components/ui/Animations";

export function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [submitError, setSubmitError] = useState("");

  const pwdChecks = validatePassword(password);
  const emailTaken = isEmailRegistered(email);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!fullName.trim()) {
      setSubmitError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setSubmitError("Please enter your work email.");
      return;
    }

    if (emailTaken) {
      setSubmitError("This email is already registered. Please log in instead.");
      return;
    }

    if (!pwdChecks.isValid) {
      setSubmitError("Please meet all password security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    if (!agreedToTerms) {
      setSubmitError("You must agree to the Terms of Service.");
      return;
    }

    // Success: Route to default role dashboard
    const defaultRoute = getDefaultRouteForRole("admin");
    navigate(defaultRoute);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <FadeIn duration={0.4} className="w-full max-w-6xl">
        <div className="w-full min-h-[820px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden shadow-2xl rounded-2xl bg-white border border-[#e2e4de]">
          {/* LEFT PANEL: Brand Narrative & Ambient Social Proof */}
          <div className="lg:col-span-5 bg-[#1b3d35] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Depth Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#43655c]/25 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-[#ff9d7c]/15 blur-3xl pointer-events-none" />

            {/* Top Branding Section */}
            <div className="relative z-10 space-y-8">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#c5eadf]">
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-white">
                  PayDoo
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-[11px] uppercase tracking-widest bg-[#022720] px-2.5 py-1 rounded-full text-[#c5eadf] font-semibold">
                  Enterprise Billing
                </span>
              </Link>

              <div className="space-y-4 pt-2">
                <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-white leading-tight">
                  The billing engine built for compounding subscription revenue.
                </h1>
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#aacec3] leading-relaxed">
                  Architected for high-velocity SaaS teams managing automated recurrent cashflow, zero-touch dunning, and friction-free payment rails.
                </p>
              </div>
            </div>

            {/* Elevated Invoice & Testimonial Artifact Card */}
            <div className="relative z-10 my-8">
              <div className="bg-white/95 backdrop-blur-md text-[#141b2b] rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] uppercase text-[#414846] font-semibold tracking-wider">
                      Verified Settlement
                    </span>
                    <p className="font-['Plus_Jakarta_Sans'] text-base text-[#022720] font-bold">
                      Invoice #PD-9021
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-[#c5eadf]/40 text-[#022720] px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#1b3d35] animate-pulse" />
                    <span className="font-['Plus_Jakarta_Sans'] text-xs font-semibold">
                      UPI AutoPay
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between py-2 border-b border-[#e9edff]">
                  <div>
                    <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] block">
                      Client Account
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#141b2b]">
                      HyperScale Labs Inc.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] block">
                      Settled Total
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#022720]">
                      ₹14,500
                    </span>
                  </div>
                </div>

                <div className="bg-[#f1f3ff] rounded-lg p-3 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#95482e] text-[18px]">
                    format_quote
                  </span>
                  <div className="space-y-1">
                    <p className="font-['Plus_Jakarta_Sans'] text-xs italic text-[#414846] leading-snug">
                      “PayDoo eliminated our manual dunning headaches in the first 48 hours. Recurrent failure rates dropped under 1.1%.”
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-['Plus_Jakarta_Sans'] text-[11px] font-bold text-[#141b2b]">
                        Rhea Sengupta
                      </span>
                      <span className="font-['Plus_Jakarta_Sans'] text-[10px] text-[#717976]">
                        VP Finance & Operations
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-[#aacec3] text-xs font-['Plus_Jakarta_Sans']">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#c5eadf]">verified</span>
                  <span>PCI-DSS Level 1</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#c5eadf]">bolt</span>
                  <span>99.995% Uptime SLA</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: High Precision Authentication & Registration Workflow */}
          <div className="lg:col-span-7 bg-[#f1f3ff] p-8 lg:p-12 flex flex-col justify-center items-center">
            <div className="w-full max-w-lg bg-white rounded-2xl p-8 lg:p-10 shadow-sm space-y-6">
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b] tracking-tight">
                    Create your PayDoo account
                  </h2>
                  <span className="font-['Plus_Jakarta_Sans'] text-[11px] bg-[#e1e8fd] px-2.5 py-1 rounded-full text-[#1b3d35] font-semibold">
                    Tier: Growth Engine
                  </span>
                </div>
                <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
                  Start your 14-day free trial. No credit card required.
                </p>
              </div>

              {/* Social Quick Auth */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#e9edff] hover:bg-[#dce2f7] text-[#141b2b] rounded-lg font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" fill="#4285F4" />
                    <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853" />
                    <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27 0-.78.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12c0 1.97.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05" />
                    <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335" />
                  </svg>
                  <span>Google Workspace</span>
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#e9edff] hover:bg-[#dce2f7] text-[#141b2b] rounded-lg font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 fill-[#141b2b]" viewBox="0 0 24 24">
                    <path clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fillRule="evenodd" />
                  </svg>
                  <span>GitHub Org</span>
                </button>
              </div>

              {/* Structural Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full h-px bg-[#e9edff]" />
                <span className="absolute bg-white px-3 font-['Plus_Jakarta_Sans'] text-[11px] text-[#717976] uppercase tracking-wider">
                  Or continue with email
                </span>
              </div>

              {/* Submit Error Flash */}
              {submitError && (
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-xs font-['Plus_Jakarta_Sans'] font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                    Full name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Arjun Mehta"
                      className="w-full h-11 px-3.5 pr-10 bg-white border border-[#c1c8c4] rounded-lg text-xs font-['Plus_Jakarta_Sans'] text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-3 text-[#717976] text-lg pointer-events-none">
                      person
                    </span>
                  </div>
                </div>

                {/* Work Email with Live Registered Error */}
                <div className="space-y-1">
                  <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                    Work email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arjun@hyperscale.io"
                      className={`w-full h-11 px-3.5 pr-10 bg-white border rounded-lg text-xs font-['Plus_Jakarta_Sans'] text-[#141b2b] focus:outline-none focus:ring-2 ${
                        emailTaken
                          ? "border-[#ba1a1a] bg-[#ffdad6]/20 focus:ring-[#ba1a1a]"
                          : "border-[#c1c8c4] focus:ring-[#1b3d35]"
                      }`}
                    />
                    <span
                      className={`material-symbols-outlined absolute right-3 top-3 text-lg ${
                        emailTaken ? "text-[#ba1a1a]" : "text-[#717976]"
                      }`}
                    >
                      {emailTaken ? "error" : "mail"}
                    </span>
                  </div>

                  {emailTaken && (
                    <div className="flex items-center gap-1.5 text-[#ba1a1a] pt-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <p className="font-['Plus_Jakarta_Sans'] text-xs font-medium">
                        This email is already registered. Please{" "}
                        <Link to="/login" className="underline font-bold">
                          log in instead
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                </div>

                {/* Create master password */}
                <div className="space-y-1">
                  <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                    Create master password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-11 px-3.5 pr-11 bg-white border border-[#c1c8c4] rounded-lg text-xs font-['Plus_Jakarta_Sans'] text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#717976] hover:text-[#141b2b]"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>

                  {/* Password Requirement Matrix */}
                  <div className="p-3 bg-[#f1f3ff] rounded-lg mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-['Plus_Jakarta_Sans']">
                      <div className={`flex items-center gap-1.5 ${pwdChecks.minLength ? "text-[#022720]" : "text-[#95482e]"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {pwdChecks.minLength ? "check_circle" : "cancel"}
                        </span>
                        <span>More than 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasUpper ? "text-[#022720]" : "text-[#95482e]"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {pwdChecks.hasUpper ? "check_circle" : "cancel"}
                        </span>
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasLower ? "text-[#022720]" : "text-[#95482e]"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {pwdChecks.hasLower ? "check_circle" : "cancel"}
                        </span>
                        <span>One lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${pwdChecks.hasSpecial ? "text-[#022720]" : "text-[#95482e]"}`}>
                        <span className="material-symbols-outlined text-sm">
                          {pwdChecks.hasSpecial ? "check_circle" : "cancel"}
                        </span>
                        <span>One special character</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full h-11 px-3.5 pr-10 bg-white border border-[#c1c8c4] rounded-lg text-xs font-['Plus_Jakarta_Sans'] text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-3 text-[#717976] text-lg pointer-events-none">
                      lock
                    </span>
                  </div>
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#1b3d35] focus:ring-[#1b3d35] accent-[#1b3d35]"
                  />
                  <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-[#022720] font-semibold hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-[#022720] font-semibold hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                {/* CTA Action */}
                <button
                  type="submit"
                  className="w-full h-12 bg-[#1b3d35] hover:bg-[#022720] active:scale-[0.99] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all mt-4"
                >
                  <span>Create account</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </form>

              {/* Login redirect link */}
              <div className="text-center pt-2 border-t border-[#e9edff]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-[#95482e] font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Log in</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default SignupPage;
