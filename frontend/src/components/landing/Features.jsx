import React from "react";
import { ShutterText } from "../motion/ShutterText";
import { Reveal } from "../motion/Reveal";
import { Stagger, StaggerItem } from "../motion/Stagger";

export const FEATURES_DATA = {
  eyebrow: "Capabilities Matrix",
  title: "Everything you need to automate billing",
  subtitle:
    "Eliminate billing spreadsheets and late reconciliation with an immutable recurring engine crafted for scale.",
  features: [
    {
      id: "feat-1",
      icon: "tune",
      title: "Plans and variants",
      description:
        "Manage granular subscription tiers, seat-based pricing, custom add-ons, and dynamic billing intervals with seamless migration paths.",
      actionLabel: "Explore Tier Engine",
      color: "primary",
    },
    {
      id: "feat-2",
      icon: "receipt_long",
      title: "Recurring invoicing",
      description:
        "Automated PDF generation, tax compliance headers, e-invoicing hooks, and multi-channel delivery via email, SMS, and WhatsApp.",
      actionLabel: "Invoicing Logic",
      color: "primary",
    },
    {
      id: "feat-3",
      icon: "percent",
      title: "Automatic taxes & discounts",
      description:
        "Automate location-aware GST, VAT calculation, reverse-charges, coupon rule engines, and automated expiration overrides.",
      actionLabel: "Tax Governance",
      color: "secondary",
    },
    {
      id: "feat-4",
      icon: "sync_saved_locally",
      title: "Smart payment dunning",
      description:
        "Rescue failed credit card renewals with intelligent retry intervals, customized recovery emails, and soft dunning notifications.",
      actionLabel: "Payment Recovery",
      color: "primary",
    },
    {
      id: "feat-5",
      icon: "account_circle",
      title: "Self-serve customer portal",
      description:
        "Let customers manage their subscriptions, swap default cards, download past invoices, and upgrade tiers without support overhead.",
      actionLabel: "Client Experience",
      color: "primary",
    },
    {
      id: "feat-6",
      icon: "query_stats",
      title: "Real-time revenue reports",
      description:
        "Gain executive clarity with instant MRR, ARR, LTV, cohort retention analysis, and churn attribution reports exportable to Excel.",
      actionLabel: "Metric Ledgers",
      color: "secondary",
    },
  ],
};

export function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 w-full">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <Reveal>
          <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#95482e] font-bold">
            {FEATURES_DATA.eyebrow}
          </span>
        </Reveal>
        
        {/* Shutter heading */}
        <div className="mt-2 flex justify-center">
          <ShutterText
            text={FEATURES_DATA.title}
            as="h2"
            trigger="inView"
            className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#141b2b] tracking-tight text-center"
          />
        </div>

        <Reveal delay={0.15}>
          <p className="font-['Plus_Jakarta_Sans'] text-base md:text-lg text-[#414846] mt-4 leading-relaxed">
            {FEATURES_DATA.subtitle}
          </p>
        </Reveal>
      </div>

      {/* Staggered card grid with 4px hover lift */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES_DATA.features.map((feat) => {
          const isSecondary = feat.color === "secondary";
          return (
            <StaggerItem
              key={feat.id}
              hoverLift={true}
              className="bg-white p-8 rounded-2xl border border-[#e2e4de] shadow-sm flex flex-col justify-between h-full group transition-colors duration-150"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${
                    isSecondary
                      ? "bg-[#ffdbd0] text-[#95482e] group-hover:bg-[#95482e] group-hover:text-white"
                      : "bg-[#e9edff] text-[#1b3d35] group-hover:bg-[#1b3d35] group-hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{feat.icon}</span>
                </div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#141b2b] mb-2">
                  {feat.title}
                </h3>
                <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#414846] leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div
                className={`pt-6 mt-6 border-t border-[#f1f3ff] flex items-center font-['Plus_Jakarta_Sans'] text-xs font-semibold ${
                  isSecondary ? "text-[#95482e]" : "text-[#1b3d35]"
                }`}
              >
                <span>{feat.actionLabel}</span>
                <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

export default Features;
