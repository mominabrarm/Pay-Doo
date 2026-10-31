import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isValidEmailFormat } from "../../utils/validators";
import { FadeIn } from "../../components/ui/Animations";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("arjun@hyperscale.io");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !isValidEmailFormat(email)) {
      setError("Please provide a valid work email address.");
      return;
    }

    // Redirect to confirmation screen with the email in state
    navigate("/reset-confirmation", { state: { email } });
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <FadeIn duration={0.4} className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-2xl border border-[#e2e4de] relative overflow-hidden">
          {/* Subtle top accent edge */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff9d7c] via-[#1b3d35] to-[#95482e]" />

          <div className="flex items-center justify-between pb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffdbd0]/40 text-[#95482e] font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wider">
              Recovery Flow
            </span>
            <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#717976]">
              Step 1 of 2
            </span>
          </div>

          <div className="my-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e9edff] flex items-center justify-center text-[#1b3d35] shadow-sm mb-3">
              <span className="material-symbols-outlined text-[28px]">lock_reset</span>
            </div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b]">
              Reset your password
            </h2>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] mt-1.5 leading-relaxed">
              Enter your registered work email and we'll transmit a secure, time-sensitive reset key.
            </p>
          </div>

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
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-11 px-3.5 pr-10 bg-white border border-[#c1c8c4] rounded-lg font-['Plus_Jakarta_Sans'] text-xs text-[#141b2b] focus:outline-none focus:ring-2 focus:ring-[#1b3d35]"
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-[#717976] text-lg pointer-events-none">
                  mail
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#1b3d35] hover:bg-[#022720] text-white font-['Plus_Jakarta_Sans'] text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Send reset instructions</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-[#edf2f7] text-center">
            <Link
              to="/login"
              className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] hover:text-[#141b2b] transition-colors inline-flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Return to login</span>
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default ForgotPasswordPage;
