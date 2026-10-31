import React from "react";
import { Link } from "react-router-dom";
import { FadeIn } from "../ui/Animations";

export const CTA_DATA = {
  badge: "Instant Deployment",
  title: "Ready to automate your subscription revenue?",
  subtitle:
    "Join over 1,200 organizations running frictionless billing cycles, automated dunning, and precision financial reporting.",
  actions: {
    primary: { label: "Get started for free", href: "/signup" },
    secondary: { label: "Talk to an expert", href: "#demo" },
  },
};

export function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full mb-12">
      <FadeIn delay={0.1}>
        <div className="bg-[#1b3d35] text-white rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
          {/* Ambient Radiance Accents */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#022720] blur-3xl pointer-events-none opacity-60" />
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#ff9d7c]/20 blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-[#c5eadf] font-['Plus_Jakarta_Sans'] text-xs font-semibold mb-6 uppercase tracking-wider">
            <span>{CTA_DATA.badge}</span>
          </div>

          {/* Headline */}
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-5xl font-bold text-white max-w-2xl leading-tight">
            {CTA_DATA.title}
          </h2>

          {/* Subtitle */}
          <p className="font-['Plus_Jakarta_Sans'] text-sm md:text-base text-[#84a89d] max-w-xl mt-4 mb-8 leading-relaxed">
            {CTA_DATA.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto z-10">
            <Link
              to={CTA_DATA.actions.primary.href}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-white text-[#141b2b] font-['Plus_Jakarta_Sans'] text-sm font-bold shadow-lg hover:bg-[#f1f3ff] transition-all text-center"
            >
              {CTA_DATA.actions.primary.label}
            </Link>
            <a
              href={CTA_DATA.actions.secondary.href}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-transparent border border-white/20 text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold hover:bg-white/10 transition-all text-center"
            >
              {CTA_DATA.actions.secondary.label}
            </a>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
