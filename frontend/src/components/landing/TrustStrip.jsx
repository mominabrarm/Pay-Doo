import React from "react";
import { FadeIn } from "../ui/Animations";

export const TRUST_STRIP_DATA = {
  label: "Trusted by high-growth subscription businesses worldwide",
  partners: [
    { name: "Lumina", icon: "all_inclusive" },
    { name: "HyperScale", icon: "deployed_code" },
    { name: "Veloce", icon: "dataset" },
    { name: "CraftFlow", icon: "draw" },
    { name: "Strata", icon: "layers" },
    { name: "Nexa Corp", icon: "hub" },
  ],
};

export function TrustStrip() {
  return (
    <section className="w-full bg-[#f1f3ff]/70 py-12 border-y border-[#e9edff]/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center">
        <FadeIn delay={0.1}>
          <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#414846] mb-8 font-semibold block text-center">
            {TRUST_STRIP_DATA.label}
          </span>
        </FadeIn>

        <FadeIn delay={0.2} staggerChildren className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 items-center justify-items-center opacity-75">
          {TRUST_STRIP_DATA.partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-[#141b2b] text-base hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl text-[#1b3d35]">
                {partner.icon}
              </span>
              <span>{partner.name}</span>
            </div>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}
