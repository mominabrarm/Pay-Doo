import React from "react";
import { Link } from "react-router-dom";

export const FOOTER_DATA = {
  brand: {
    name: "PayDoo",
    description:
      "Editorial revenue architecture and sovereign subscription infrastructure built for modern enterprise billing operations.",
    badge: "SOC2 Type II Certified",
  },
  columns: [
    {
      title: "Product",
      links: [
        { label: "Recurring Billing", href: "#features" },
        { label: "Usage Metering", href: "#features" },
        { label: "Tax Invoicing", href: "#features" },
        { label: "Pricing Models", href: "#pricing" },
      ],
    },
    {
      title: "Platform",
      links: [
        { label: "Revenue Ledger", href: "#dashboard" },
        { label: "Integrations", href: "#how-it-works" },
        { label: "Developer API", href: "#" },
        { label: "Changelog", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Security", href: "#" },
        { label: "Compliance", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
      ],
    },
  ],
  copyright: "© 2026 PayDoo Technologies Inc. All rights reserved.",
  bottomTag: "Sovereign Ledger Operations",
};

export function Footer() {
  return (
    <footer className="w-full bg-[#f1f3ff] border-t border-[#e9edff] mt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1b3d35] flex items-center justify-center text-white text-sm">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
              <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#1b3d35]">
                {FOOTER_DATA.brand.name}
              </span>
            </div>
            <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] max-w-sm leading-relaxed">
              {FOOTER_DATA.brand.description}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-['Plus_Jakarta_Sans'] font-semibold bg-[#e1e8fd] text-[#1b3d35]">
                {FOOTER_DATA.brand.badge}
              </span>
            </div>
          </div>

          {/* Links Columns */}
          {FOOTER_DATA.columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#141b2b] uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] hover:text-[#141b2b] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-[#e2e4de] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
            {FOOTER_DATA.copyright}
          </p>
          <div className="flex items-center gap-6">
            <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
              {FOOTER_DATA.bottomTag}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
