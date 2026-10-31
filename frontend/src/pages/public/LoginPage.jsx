import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDefaultRouteForRole } from "../../config/app.config";
import { FadeIn } from "../../components/ui/Animations";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("arjun@hyperscale.io");
  const [password, setPassword] = useState("supersecretpwd");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    // Role-based redirect as requested
    const targetRoute = getDefaultRouteForRole(role);
    navigate(targetRoute);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <FadeIn duration={0.4} className="w-full max-w-6xl">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* LEFT PANEL: Brand & Metrics Showcase */}
            <div className="lg:col-span-5 bg-[#1b3d35] text-white rounded-2xl p-8 md:p-12 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[580px]">
              {/* Radiance Accents */}
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#43655c]/25 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#ff9d7c]/15 blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <Link to="/" className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1b3d35] shadow-md font-bold text-lg">
                      <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                    </div>
                    <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-white">
                      PayDoo
                    </span>
                  </Link>
                  <span className="px-3 py-1 rounded-full bg-[#022720]/50 text-[#c5eadf] font-['Plus_Jakarta_Sans'] text-[11px] uppercase tracking-wider font-semibold">
                    FinOps v3.2
                  </span>
                </div>

                <div className="pt-4">
                  <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-white max-w-sm leading-snug">
                    Welcome back to effortless subscription operations.
                  </h1>
                  <p className="mt-3 font-['Plus_Jakarta_Sans'] text-xs sm:text-sm text-[#84a89d] max-w-xs leading-relaxed">
                    Architectural clarity, automated reconciliation, and executive governance for hyperscale SaaS.
                  </p>
                </div>
              </div>

              {/* Ambient Metric Card Mockup */}
              <div className="relative z-10 my-6 space-y-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-lg space-y-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] uppercase tracking-wider text-[#aacec3]">
                      Consolidated Metric
                    </span>
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#c5eadf]/20 text-[#c5eadf] font-['Plus_Jakarta_Sans'] text-xs font-semibold">
                      <span className="material-symbols-outlined text-xs">arrow_upward</span>
                      <span>12% MoM</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="font-['Plus_Jakarta_Sans'] text-4xl font-bold text-white">
                      ₹1.2L
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-sm text-[#aacec3]">
                      MRR
                    </span>
                  </div>

                  {/* Sparkline SVG */}
                  <div className="pt-2">
                    <svg className="w-full h-12 text-[#c5eadf]" fill="none" viewBox="0 0 240 48" preserveAspectRatio="none">
                      <path d="M0 40 C 30 38, 45 32, 70 30 C 95 28, 120 18, 150 20 C 180 22, 205 10, 240 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                      <path d="M0 40 C 30 38, 45 32, 70 30 C 95 28, 120 18, 150 20 C 180 22, 205 10, 240 6 L 240 48 L 0 48 Z" fill="currentColor" fillOpacity="0.12" />
                      <circle cx="240" cy="6" r="3.5" className="fill-[#ff9d7c]" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#84a89d] block">
                      Active Subscribers
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-white block mt-0.5">
                      2,840
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <span className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#84a89d] block">
                      Net Revenue Churn
                    </span>
                    <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#ffdbd0] block mt-0.5">
                      0.42%
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust footer */}
              <div className="relative z-10 pt-2 flex items-center space-x-3">
                <span className="material-symbols-outlined text-[#c5eadf] text-lg">verified</span>
                <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#aacec3]">
                  Trusted by 450+ scale-ups across India and Southeast Asia.
                </p>
              </div>
            </div>

            {/* RIGHT PANEL: Login Card */}
            <div className="lg:col-span-7 bg-white text-[#141b2b] rounded-2xl p-8 md:p-12 flex flex-col justify-between shadow-xl border border-[#e2e4de]">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-wider text-[#717976] font-semibold">
                    Authentication
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e9edff] text-[#1b3d35] font-['Plus_Jakarta_Sans'] text-xs font-semibold">
                    Live Portal
                  </span>
                </div>

                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b]">
                  Log in to PayDoo
                </h2>
                <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] mt-1 mb-6">
                  Enter your credentials or access via institutional SSO.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-lg text-xs font-['Plus_Jakarta_Sans'] font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b] mb-1.5">
                      Work Email
                    </label>
                    <div className="relative rounded-lg bg-white">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#717976]">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="block w-full pl-9 pr-3 py-2.5 bg-white border border-[#c1c8c4] font-['Plus_Jakarta_Sans'] text-xs text-[#141b2b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="font-['Plus_Jakarta_Sans'] text-xs text-[#95482e] hover:underline font-semibold"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative rounded-lg bg-white">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#717976]">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full pl-9 pr-10 py-2.5 bg-white border border-[#c1c8c4] font-['Plus_Jakarta_Sans'] text-xs text-[#141b2b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#717976] hover:text-[#141b2b]"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b] mb-1.5">
                      Sign in as role:
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-[#c1c8c4] font-['Plus_Jakarta_Sans'] text-xs text-[#141b2b] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                    >
                      <option value="admin">Administrator (Dashboard Overview)</option>
                      <option value="billing_manager">Billing Manager (Invoices)</option>
                      <option value="finance_ops">Finance Ops (Subscriptions)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-1">
                    <label className="relative flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1b3d35] focus:ring-[#1b3d35] accent-[#1b3d35]"
                      />
                      <span className="ml-2 font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
                        Remember me for 30 days
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 px-4 bg-[#1b3d35] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold rounded-lg shadow-sm hover:bg-[#022720] transition-all active:scale-[0.99] flex items-center justify-center space-x-2"
                  >
                    <span>Log in</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </form>

                {/* SSO Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full bg-[#e9edff] h-[1px]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-['Plus_Jakarta_Sans']">
                    <span className="bg-white px-3 text-[#717976]">
                      or connect through
                    </span>
                  </div>
                </div>

                {/* SSO Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#f1f3ff] hover:bg-[#e9edff] text-[#141b2b] font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#f1f3ff] hover:bg-[#e9edff] text-[#141b2b] font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#1b3d35]">shield</span>
                    <span>Okta SSO</span>
                  </button>
                </div>
              </div>

              {/* Bottom footer */}
              <div className="pt-6 mt-6 border-t border-[#edf2f7] flex items-center justify-between text-xs font-['Plus_Jakarta_Sans']">
                <span className="text-[#414846]">Don't have an account?</span>
                <Link to="/signup" className="text-[#95482e] font-bold hover:underline">
                  Sign up for free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default LoginPage;
