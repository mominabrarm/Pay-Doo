import React from "react";
import { FadeIn, HoverLift } from "../ui/Animations";

export const HOW_IT_WORKS_DATA = {
  eyebrow: "Linear Workflow",
  title: "From setup to cash collection in four steps",
  subtitle:
    "Designed for simplicity so you spend time growing product, not configuring complex accounting tools.",
  steps: [
    {
      step: "01",
      title: "Create plan",
      description:
        "Define pricing models, recurrence cycle (monthly, quarterly, annual), trial days, and usage limits.",
      tag: "Pro Tier · ₹6,999/mo",
      tagIcon: "check",
      badgeColor: "bg-[#1b3d35] text-white",
    },
    {
      step: "02",
      title: "Start subscription",
      description:
        "Attach customers via hosted checkout, drop-in widgets, or simple headless REST endpoints.",
      tag: "Sub ID: #SUB-8921",
      tagIcon: "link",
      badgeColor: "bg-[#1b3d35] text-white",
    },
    {
      step: "03",
      title: "Auto-invoice",
      description:
        "Invoices generate automatically each billing date with calculated taxes, line-items, and credits.",
      tag: "GST Compliant PDF",
      tagIcon: "description",
      badgeColor: "bg-[#95482e] text-white",
    },
    {
      step: "04",
      title: "Collect payment",
      description:
        "Charge saved card or UPI auto-pay mandate, update the ledger, and notify team via webhooks.",
      tag: "Auto-Captured",
      tagIcon: "payments",
      badgeColor: "bg-[#022720] text-white",
    },
  ],
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-[#f1f3ff] py-24 border-y border-[#e9edff]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <FadeIn delay={0.1}>
            <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#1b3d35] font-bold">
              {HOW_IT_WORKS_DATA.eyebrow}
            </span>
          </FadeIn>
          <FadeIn delay={0.2}>
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#141b2b] mt-2 tracking-tight">
              {HOW_IT_WORKS_DATA.title}
            </h2>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="font-['Plus_Jakarta_Sans'] text-base md:text-lg text-[#414846] mt-3 leading-relaxed">
              {HOW_IT_WORKS_DATA.subtitle}
            </p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HOW_IT_WORKS_DATA.steps.map((item, index) => (
            <FadeIn key={item.step} delay={0.1 * index} className="h-full">
              <HoverLift
                y={-4}
                className="bg-white p-6 rounded-2xl border border-[#e2e4de] shadow-sm hover:shadow-lg transition-all flex flex-col h-full justify-between"
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-full ${item.badgeColor} flex items-center justify-center font-['Plus_Jakarta_Sans'] font-bold text-xs mb-6 shadow-sm`}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#141b2b] mb-2">
                    {item.title}
                  </h3>
                  <p className="font-['Plus_Jakarta_Sans'] text-xs sm:text-sm text-[#414846] leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <div className="mt-auto bg-[#f1f3ff] px-3 py-2 rounded-lg flex items-center justify-between">
                  <span className="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-[#141b2b]">
                    {item.tag}
                  </span>
                  <span className="material-symbols-outlined text-sm text-[#1b3d35]">
                    {item.tagIcon}
                  </span>
                </div>
              </HoverLift>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
