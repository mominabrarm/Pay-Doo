import React from "react";
import { Navbar } from "../../components/landing/Navbar";
import { Hero } from "../../components/landing/Hero";
import { TrustStrip } from "../../components/landing/TrustStrip";
import { Features } from "../../components/landing/Features";
import { HowItWorks } from "../../components/landing/HowItWorks";
import { DashboardPreview } from "../../components/landing/DashboardPreview";
import { Pricing } from "../../components/landing/Pricing";
import { CTA } from "../../components/landing/CTA";
import { Footer } from "../../components/landing/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] selection:bg-[#c5eadf] selection:text-[#00201a]">
      <Navbar />
      <main className="w-full pt-20">
        <Hero />
        <TrustStrip />
        <DashboardPreview />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
