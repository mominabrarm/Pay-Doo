import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShutterText } from "../motion/ShutterText";
import { Reveal } from "../motion/Reveal";
import { Stagger, StaggerItem } from "../motion/Stagger";
import { RollingNumber } from "../motion/RollingNumber";

export const PRICING_DATA = {
  eyebrow: "Predictable Investment",
  title: "Simple, transparent pricing",
  subtitle:
    "Fair plans that scale with your recurring revenue without hidden take-rates or billing penalties.",
  discountBadge: "Save 20%",
  tiers: [
    {
      id: "starter",
      name: "Starter",
      badge: "Early-Stage Founders",
      description: "For launching your first subscription tier or retainer contract.",
      monthlyPrice: "₹2,499",
      annualPrice: "₹1,999",
      isPopular: false,
      ctaLabel: "Get Started",
      ctaHref: "/signup",
      features: [
        { text: "Up to 250 active subscribers", included: true },
        { text: "Unlimited recurring invoices", included: true },
        { text: "Standard payment retry engine", included: true },
        { text: "Automated GST/tax calculations", included: true },
        { text: "Custom domain portal", included: false },
      ],
    },
    {
      id: "growth",
      name: "Growth",
      badge: "Scaling SaaS & Studios",
      description: "Complete revenue automation with self-serve client portals.",
      monthlyPrice: "₹6,999",
      annualPrice: "₹5,599",
      isPopular: true,
      popularLabel: "Most Popular",
      ctaLabel: "Start 14-Day Free Trial",
      ctaHref: "/signup",
      features: [
        { text: "Up to 2,500 active subscribers", included: true, bold: true },
        { text: "Custom branded customer portal", included: true },
        { text: "Intelligent dunning & smart recovery", included: true },
        { text: "Cohorts & churn telemetry dashboard", included: true },
        { text: "Multi-currency & localized VAT/GST", included: true },
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      badge: "Volume & Regulated",
      description: "Dedicated sovereign ledger, ERP integration, and priority SLA.",
      monthlyPrice: "Custom",
      annualPrice: "Custom",
      periodText: "/annual billing",
      isPopular: false,
      ctaLabel: "Talk to Enterprise Sales",
      ctaHref: "/signup",
      features: [
        { text: "Unlimited subscribers & invoices", included: true },
        { text: "Custom payment gateway routing", included: true },
        { text: "Dedicated Technical Account Manager", included: true },
        { text: "SOC2 Type II & ERP sync connectors", included: true },
        { text: "Custom Master Services Agreement", included: true },
      ],
    },
  ],
};

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 lg:px-12 py-24 w-full">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <Reveal>
          <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#95482e] font-bold">
            {PRICING_DATA.eyebrow}
          </span>
        </Reveal>

        {/* Shutter heading */}
        <div className="mt-2 flex justify-center">
          <ShutterText
            text={PRICING_DATA.title}
            as="h2"
            trigger="inView"
            className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#141b2b] tracking-tight text-center"
          />
        </div>

        <Reveal delay={0.15}>
          <p className="font-['Plus_Jakarta_Sans'] text-base md:text-lg text-[#414846] mt-3 leading-relaxed">
            {PRICING_DATA.subtitle}
          </p>
        </Reveal>

        {/* Billing Cycle Toggle */}
        <Reveal delay={0.25}>
          <div className="mt-8 inline-flex items-center p-1 bg-[#e9edff] rounded-full border border-[#dce2f7]">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-[#141b2b] shadow-sm"
                  : "text-[#414846] hover:text-[#141b2b]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-full font-['Plus_Jakarta_Sans'] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-white text-[#141b2b] shadow-sm"
                  : "text-[#414846] hover:text-[#141b2b]"
              }`}
            >
              <span>Annual</span>
              <span className="bg-[#ffdbd0] text-[#95482e] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {PRICING_DATA.discountBadge}
              </span>
            </button>
          </div>
        </Reveal>
      </div>

      {/* 3 Tier Cards Staggered */}
      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {PRICING_DATA.tiers.map((tier) => {
          const price = billingCycle === "annual" ? tier.annualPrice : tier.monthlyPrice;
          const period =
            tier.periodText || (billingCycle === "annual" ? "/mo (billed annually)" : "/month");

          return (
            <StaggerItem
              key={tier.id}
              hoverLift={true}
              className={`bg-white p-8 rounded-2xl border flex flex-col justify-between h-full relative transition-colors duration-150 ${
                tier.isPopular
                  ? "border-[#1b3d35] shadow-xl ring-2 ring-[#1b3d35]/20 lg:-translate-y-2"
                  : "border-[#e2e4de] shadow-sm"
              }`}
            >
              <div>
                {/* Popular Pill */}
                {tier.isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1b3d35] text-[#c5eadf] text-[11px] font-['Plus_Jakarta_Sans'] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {tier.popularLabel}
                  </span>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-wider text-[#95482e]">
                    {tier.badge}
                  </span>
                </div>

                <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b]">
                  {tier.name}
                </h3>
                <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] mt-2 mb-6 min-h-[36px]">
                  {tier.description}
                </p>

                {/* Price Display with RollingNumber */}
                <div className="flex items-baseline gap-1 mb-8 pb-6 border-b border-[#f1f3ff]">
                  <span className="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold text-[#141b2b] tracking-tight">
                    {price === "Custom" ? (
                      price
                    ) : (
                      <RollingNumber value={price} />
                    )}
                  </span>
                  <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#717976]">
                    {period}
                  </span>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat) => (
                    <li
                      key={feat.text}
                      className="flex items-start gap-2.5 font-['Plus_Jakarta_Sans'] text-xs text-[#414846]"
                    >
                      <span
                        className={`material-symbols-outlined text-base shrink-0 ${
                          feat.included ? "text-[#1b3d35]" : "text-[#c1c8c4]"
                        }`}
                      >
                        {feat.included ? "check_circle" : "cancel"}
                      </span>
                      <span className={feat.bold ? "font-bold text-[#141b2b]" : ""}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action CTA */}
              <Link
                to={tier.ctaHref}
                className={`w-full py-3.5 px-4 rounded-lg font-['Plus_Jakarta_Sans'] text-xs font-bold text-center block transition-all shadow-sm ${
                  tier.isPopular
                    ? "bg-[#1b3d35] text-white hover:bg-[#022720] shadow-md"
                    : "bg-[#e9edff] text-[#141b2b] hover:bg-[#dce2f7]"
                }`}
              >
                {tier.ctaLabel}
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

export default Pricing;
