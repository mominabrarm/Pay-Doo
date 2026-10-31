import React from "react";
import { Navbar } from "../../components/landing/Navbar";
import { Hero } from "../../components/landing/Hero";
import { Features } from "../../components/landing/Features";
import { HowItWorks } from "../../components/landing/HowItWorks";
import { DashboardPreview } from "../../components/landing/DashboardPreview";
import { Pricing } from "../../components/landing/Pricing";
import { CTA } from "../../components/landing/CTA";
import { Footer } from "../../components/landing/Footer";
import { SmoothScroll } from "../../components/motion/SmoothScroll";
import { ScrollProgress } from "../../components/motion/ScrollProgress";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] selection:bg-[#c5eadf] selection:text-[#00201a]">
      {/* Lenis Smooth Scroll for Public Route */}
      <SmoothScroll />
      {/* Top Scroll Progress Bar */}
      <ScrollProgress color="#1B3D35" height={3} />

      <Navbar />
      <main className="w-full pt-20">
        <Hero />
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
