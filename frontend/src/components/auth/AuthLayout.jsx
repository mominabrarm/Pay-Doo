import React from "react";
import { Link } from "react-router-dom";
import authShowcaseImg from "../../assets/illustrations/auth-showcase.png";
import { Logo } from "../Logo";

/**
 * Shared AuthLayout:
 * - Left side (about 45%): Form container with forest green 'P' logo mark, headings, inputs and buttons.
 * - Right side (about 55%, hidden below lg): Large rounded (32px) mint #E4EFE9 panel
 *   displaying src/assets/illustrations/auth-showcase.png with object-contain.
 * - Zero animations (only 150ms transitions), accessible semantic structure.
 * - Styled strictly using design tokens from Tailwind config (no hard-coded hex values).
 */
export function AuthLayout({ children, mode = "login" }) {
  const isLogin = mode === "login";

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans text-forest">
      
      {/* ======================================================== */}
      {/* LEFT PANEL: Form Side (About 45% on desktop)             */}
      {/* ======================================================== */}
      <main className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16">
        {/* Brand Header */}
        <header>
          <Link
            to="/"
            className="inline-flex items-center group transition-opacity duration-150 hover:opacity-90"
            aria-label="PayDoo Home"
          >
            <Logo height={38} alt="PayDoo" />
          </Link>
        </header>

        {/* Main Form Content */}
        <div className="my-auto py-8 w-full max-w-md mx-auto">
          {children}
        </div>

        {/* Footer info */}
        <footer className="text-xs text-body-muted text-center lg:text-left">
          © {new Date().getFullYear()} PayDoo Inc. All rights reserved.
        </footer>
      </main>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Mint #E4EFE9 Showcase (About 55% on desktop)*/}
      {/* Hidden below lg as required                              */}
      {/* ======================================================== */}
      <aside
        className="hidden lg:flex lg:w-[55%] p-6 lg:p-8 xl:p-10"
        aria-label="Product Showcase"
      >
        <div className="w-full h-full bg-mint rounded-[32px] p-8 xl:p-12 flex flex-col justify-between items-center text-center">
          
          {/* Top spacer */}
          <div className="w-full flex justify-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal bg-white/80 px-3.5 py-1 rounded-full border border-teal/20">
              Subscription Billing
            </span>
          </div>

          {/* Central Image: auth-showcase.png with object-contain (no redrawing, recoloring, or filters) */}
          <div className="w-full flex-1 flex items-center justify-center py-4 my-auto">
            <img
              src={authShowcaseImg}
              alt="Person managing subscription plans, invoices and recurring payments on PayDoo"
              className="max-h-[460px] xl:max-h-[520px] w-auto max-w-full object-contain"
            />
          </div>

          {/* Headline & Subline */}
          <div className="w-full max-w-lg space-y-2 pt-2">
            <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-forest leading-snug">
              {isLogin ? (
                <>
                  All your subscriptions{" "}
                  <span className="text-teal">in one place</span>
                </>
              ) : (
                <>
                  Launch recurring billing{" "}
                  <span className="text-teal">in minutes</span>
                </>
              )}
            </h2>
            <p className="text-sm xl:text-base text-body-muted font-normal leading-relaxed">
              Track, manage and never miss a payment again.
            </p>
          </div>

        </div>
      </aside>

    </div>
  );
}

export default AuthLayout;
