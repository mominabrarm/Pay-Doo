import React from "react";
import { Link } from "react-router-dom";
import { FadeIn } from "../ui/Animations";

export const HERO_DATA = {
  badge: {
    dotColor: "#95482e",
    text: "Built for recurring revenue operations",
  },
  headline: "Run your subscriptions and billing in one place",
  subtitle:
    "Plans, recurring invoices, automated dunning, and sovereign revenue metrics—all perfectly synchronized so renewals never fail and no seat is missed.",
  cta: {
    primary: { label: "Start for free", href: "/signup" },
    secondary: { label: "Book a demo", href: "#demo" },
  },
  microReassurances: [
    { icon: "verified", text: "No credit card needed" },
    { icon: "bolt", text: "10-minute setup" },
  ],
};

export function Hero() {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-6 lg:px-12 py-20 md:py-32 flex flex-col items-center justify-center min-h-[560px] overflow-hidden">
      {/* Ambient Radial Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#c5eadf]/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -top-24 right-10 w-96 h-96 bg-[#ffdbd0]/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Center Hero Content */}
      <div className="text-center max-w-3xl flex flex-col items-center z-10 my-auto">
        {/* Pill Badge */}
        <FadeIn delay={0.1} direction="down">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e9edff] text-[#141b2b] font-['Plus_Jakarta_Sans'] text-xs font-semibold mb-8 shadow-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: HERO_DATA.badge.dotColor }}
            />
            <span className="text-[#414846]">{HERO_DATA.badge.text}</span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.2} direction="up">
          <h1 className="font-['Plus_Jakarta_Sans'] text-4xl sm:text-5xl md:text-[56px] md:leading-[64px] font-bold text-[#022720] tracking-tight text-center mb-6 max-w-2xl">
            {HERO_DATA.headline}
          </h1>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn delay={0.3} direction="up">
          <p className="font-['Plus_Jakarta_Sans'] text-base md:text-lg text-[#414846] max-w-xl mb-10 text-center leading-relaxed">
            {HERO_DATA.subtitle}
          </p>
        </FadeIn>

        {/* Action Buttons */}
        <FadeIn delay={0.4} direction="up">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              to={HERO_DATA.cta.primary.href}
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#1b3d35] text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold hover:bg-[#022720] shadow-md hover:shadow-lg active:scale-95 transition-all text-center"
            >
              {HERO_DATA.cta.primary.label}
            </Link>
            <a
              href={HERO_DATA.cta.secondary.href}
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-white text-[#141b2b] border border-[#e1e8f0] font-['Plus_Jakarta_Sans'] text-sm font-semibold shadow-sm hover:bg-[#f1f3ff] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">play_circle</span>
              {HERO_DATA.cta.secondary.label}
            </a>
          </div>
        </FadeIn>

        {/* Micro reassurance */}
        <FadeIn delay={0.5} direction="up">
          <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-[#414846] font-['Plus_Jakarta_Sans'] text-xs">
            {HERO_DATA.microReassurances.map((item) => (
              <span key={item.text} className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-base text-[#022720]">
                  {item.icon}
                </span>
                {item.text}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
