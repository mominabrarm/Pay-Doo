import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export const NAVBAR_DATA = {
  brand: {
    name: "PayDoo",
    tag: "Enterprise Billing",
  },
  links: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Pricing", href: "#pricing" },
  ],
  actions: {
    login: { label: "Log in", href: "/login" },
    signup: { label: "Get started", href: "/signup" },
  },
};

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#f9f9ff]/90 backdrop-blur-xl border-b border-[#e9edff]/80 transition-all">
      <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#1b3d35] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-[#022720] transition-colors">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-[#1b3d35]">
            {NAVBAR_DATA.brand.name}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {NAVBAR_DATA.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#414846] hover:text-[#141b2b] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            to={NAVBAR_DATA.actions.login.href}
            className="hidden sm:inline-flex font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#414846] hover:text-[#141b2b] transition-colors px-3 py-2"
          >
            {NAVBAR_DATA.actions.login.label}
          </Link>

          <Link
            to={NAVBAR_DATA.actions.signup.href}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#1b3d35] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold hover:bg-[#022720] transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {NAVBAR_DATA.actions.signup.label}
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#414846] hover:text-[#141b2b] hover:bg-[#e9edff] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#f9f9ff] border-b border-[#e9edff] px-6 py-5 shadow-lg space-y-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3">
            {NAVBAR_DATA.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-['Plus_Jakarta_Sans'] text-base font-medium text-[#414846] hover:text-[#141b2b] py-2 border-b border-[#f1f3ff]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to={NAVBAR_DATA.actions.login.href}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg border border-[#c1c8c4] font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#141b2b]"
            >
              Log in
            </Link>
            <Link
              to={NAVBAR_DATA.actions.signup.href}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg bg-[#1b3d35] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
