import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FadeIn } from "../../components/ui/Animations";
import { Logo } from "../../components/Logo";

export function ResetConfirmationPage() {
  const location = useLocation();
  const email = location.state?.email || "arjun@hyperscale.io";

  const [countdown, setCountdown] = useState(42);
  const [resendActive, setResendActive] = useState(false);
  const [resendNotification, setResendNotification] = useState("");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendActive(true);
    }
  }, [countdown]);

  const handleResend = () => {
    if (!resendActive) return;
    setResendNotification("A new verification link has been dispatched.");
    setCountdown(45);
    setResendActive(false);
    setTimeout(() => setResendNotification(""), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <FadeIn duration={0.4} className="w-full max-w-lg">
        <div className="bg-white text-[#141b2b] rounded-2xl p-8 md:p-10 shadow-2xl border border-[#e2e4de] relative overflow-hidden flex flex-col justify-between">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff9d7c] via-[#1b3d35] to-[#95482e]" />

          <div className="mb-4 text-center">
            <Link to="/" className="inline-flex transition-opacity hover:opacity-90">
              <Logo height={32} alt="PayDoo" />
            </Link>
          </div>

          <div>
            <div className="flex items-center justify-between pb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdbd0]/30 text-[#95482e] font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-wide font-semibold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#95482e]" />
                <span>Recovery Flow</span>
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#717976]">
                Step 2 of 2
              </span>
            </div>

            {/* Mail Illustration badge */}
            <div className="my-6 flex justify-center">
              <div className="relative w-20 h-20 rounded-2xl bg-[#e9edff] flex items-center justify-center shadow-inner">
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#95482e] text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">done</span>
                </div>
                <div className="w-14 h-14 rounded-xl bg-[#1b3d35] text-white flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 mb-6">
              <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b] tracking-tight">
                Check your inbox
              </h3>
              <p className="font-['Plus_Jakarta_Sans'] text-xs sm:text-sm text-[#414846] max-w-xs mx-auto leading-relaxed">
                We sent a password reset link to{" "}
                <span className="font-bold text-[#141b2b] underline decoration-[#95482e]">
                  {email}
                </span>
                . The link expires in 15 minutes.
              </p>
            </div>

            {resendNotification && (
              <div className="mb-4 p-3 bg-[#e9faf3] border border-[#a7f3d0] text-[#087653] rounded-lg text-xs font-['Plus_Jakarta_Sans'] font-semibold text-center">
                {resendNotification}
              </div>
            )}

            {/* Security details box */}
            <div className="bg-[#f1f3ff] rounded-xl p-4 space-y-3 shadow-sm border border-[#e2e4de]">
              <div className="flex items-start space-x-2.5">
                <span className="material-symbols-outlined text-[#1b3d35] text-[18px] mt-0.5">
                  lock_clock
                </span>
                <div>
                  <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#141b2b]">
                    Time-sensitive magic token
                  </h4>
                  <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#414846] leading-snug">
                    For security, existing active sessions will remain active until you confirm your new key.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-1 border-t border-[#e2e4de]/60">
                <span className="material-symbols-outlined text-[#95482e] text-[18px] mt-0.5">
                  info
                </span>
                <div>
                  <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#141b2b]">
                    Check spam or promotion tabs
                  </h4>
                  <p className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#414846] leading-snug">
                    Automated delivery from notifications@paydoo.internal.
                  </p>
                </div>
              </div>
            </div>

            {/* Resend trigger */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={handleResend}
                disabled={!resendActive}
                className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] flex items-center justify-center mx-auto space-x-1.5 disabled:opacity-75"
              >
                <span>Didn't receive it?</span>
                <span className={`font-semibold ${resendActive ? "text-[#95482e] hover:underline cursor-pointer" : "text-[#717976]"}`}>
                  {resendActive ? "Resend email now" : `Resend email in ${countdown}s`}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-6 mt-6 space-y-3 border-t border-[#edf2f7]">
            <Link
              to="/login"
              className="w-full py-2.5 px-4 bg-[#f1f3ff] hover:bg-[#e9edff] text-[#141b2b] font-['Plus_Jakarta_Sans'] text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Return to login</span>
            </Link>

            <div className="text-center">
              <a
                href="#"
                className="font-['Plus_Jakarta_Sans'] text-[11px] text-[#717976] hover:text-[#141b2b] transition-colors"
              >
                Having trouble? Contact support@paydoo.com
              </a>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default ResetConfirmationPage;
