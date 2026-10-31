import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ShutterText } from "../motion/ShutterText";
import { RollingNumber } from "../motion/RollingNumber";
import { Reveal } from "../motion/Reveal";

export const DASHBOARD_PREVIEW_DATA = {
  eyebrow: "Unified Sovereign Ledger",
  title: "Executive telemetry at your fingertips",
  urlBar: "app.paydoo.io/live/revenue-ledger",
  kpis: [
    {
      label: "Monthly Recurring Revenue",
      value: "₹9,48,665",
      badge: "+14.2%",
      badgeType: "positive",
      icon: "payments",
    },
    {
      label: "Active Subscriptions",
      value: "1,761",
      badge: "+82 net",
      badgeType: "neutral",
      icon: "person_add",
    },
    {
      label: "Net Settled Revenue",
      value: "₹12,78,020",
      badge: "+18.0%",
      badgeType: "positive",
      icon: "account_balance_wallet",
    },
    {
      label: "Gross Churn Rate",
      value: "0.42%",
      badge: "-0.15%",
      badgeType: "terracotta",
      icon: "trending_down",
    },
  ],
  chart: {
    title: "Revenue Growth & Expansion",
    subtitle: "Tracking new vs. contraction cohorts over the last 6 months",
    months: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr (Current)"],
  },
  recentInvoices: [
    { account: "Acme Cloud", plan: "Growth Annual", amount: "₹83,988", status: "Paid", statusClass: "bg-[#c5eadf] text-[#022720]" },
    { account: "Zenith Labs", plan: "Enterprise Custom", amount: "₹2,40,000", status: "Processing", statusClass: "bg-[#ffdbd0] text-[#95482e]" },
    { account: "Kite Media", plan: "Starter Tier", amount: "₹2,499", status: "Paid", statusClass: "bg-[#c5eadf] text-[#022720]" },
    { account: "Polymer Tech", plan: "Growth Monthly", amount: "₹6,999", status: "Pending", statusClass: "bg-[#e9edff] text-[#414846]" },
  ],
};

export function DashboardPreview() {
  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: true, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="dashboard" className="max-w-7xl mx-auto px-6 lg:px-12 py-20 w-full">
      <div className="text-center mb-10">
        <Reveal>
          <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#95482e] font-bold">
            {DASHBOARD_PREVIEW_DATA.eyebrow}
          </span>
        </Reveal>
        
        {/* Shutter Heading on Scroll */}
        <div className="mt-2 flex justify-center">
          <ShutterText
            text={DASHBOARD_PREVIEW_DATA.title}
            as="h2"
            trigger="inView"
            className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#141b2b] tracking-tight text-center"
          />
        </div>
      </div>

      {/* macOS / Browser Frame */}
      <Reveal delay={0.15}>
        <div className="w-full bg-white rounded-2xl shadow-2xl border border-[#e1e8fd] overflow-hidden">
          {/* Browser Top Bar */}
          <div className="bg-[#e9edff] px-4 py-3 flex items-center justify-between border-b border-[#dce2f7]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ba1a1a] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#ff9d7c] inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#c5eadf] inline-block" />
            </div>

            <div className="bg-white/80 px-8 py-1 rounded-md text-[#414846] font-['Plus_Jakarta_Sans'] text-xs flex items-center gap-2 shadow-sm border border-black/5">
              <span className="material-symbols-outlined text-xs">lock</span>
              <span>{DASHBOARD_PREVIEW_DATA.urlBar}</span>
            </div>

            <div className="flex items-center gap-2 text-[#414846]">
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span className="material-symbols-outlined text-sm">more_vert</span>
            </div>
          </div>

          {/* App Canvas Inside Browser */}
          <div className="p-6 md:p-8 space-y-8 bg-[#f9f9ff]">
            
            {/* Top 4 KPI Metrics with RollingNumber & Hover Lift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {DASHBOARD_PREVIEW_DATA.kpis.map((kpi) => (
                <motion.div
                  key={kpi.label}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: -4,
                          boxShadow: "0 12px 28px -4px rgba(27,61,53,0.12)",
                          transition: { duration: 0.15 },
                        }
                  }
                  className="bg-white p-5 rounded-xl border border-[#e2e4de] shadow-sm flex flex-col justify-between transition-colors duration-150"
                >
                  <div className="flex items-center justify-between text-[#414846]">
                    <span className="font-['Plus_Jakarta_Sans'] text-xs font-semibold">
                      {kpi.label}
                    </span>
                    <span className="material-symbols-outlined text-base text-[#1b3d35]">
                      {kpi.icon}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#141b2b]">
                      <RollingNumber value={kpi.value} />
                    </span>
                    <span
                      className={`font-['Plus_Jakarta_Sans'] text-xs font-bold px-2 py-0.5 rounded-full ${
                        kpi.badgeType === "terracotta"
                          ? "bg-[#ffdbd0] text-[#95482e]"
                          : "bg-[#c5eadf] text-[#022720]"
                      }`}
                    >
                      {kpi.badge}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Split View: Chart + Recent Invoices Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Chart Container (7 Cols) */}
              <div
                ref={chartRef}
                className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#e2e4de] shadow-sm flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#141b2b]">
                      {DASHBOARD_PREVIEW_DATA.chart.title}
                    </h3>
                    <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846]">
                      {DASHBOARD_PREVIEW_DATA.chart.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1b3d35]" />
                      <span className="text-[#414846]">MRR Growth</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#95482e]" />
                      <span className="text-[#414846]">Expansion</span>
                    </div>
                  </div>
                </div>

                {/* SVG Area Chart with stroke-dashoffset line drawing and area fill reveal */}
                <div className="w-full h-52 relative flex items-end my-2">
                  <svg
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                    viewBox="0 0 600 200"
                  >
                    <defs>
                      <linearGradient id="forestGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#1B3D35" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#1B3D35" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="terraGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#95482E" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#95482E" stopOpacity="0.0" />
                      </linearGradient>
                      <clipPath id="chartClip">
                        <motion.rect
                          x="0"
                          y="0"
                          height="200"
                          initial={{ width: 0 }}
                          animate={isChartInView || shouldReduceMotion ? { width: 600 } : { width: 0 }}
                          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </clipPath>
                    </defs>

                    {/* Grid Lines */}
                    <line stroke="#E9EDFF" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="40" y2="40" />
                    <line stroke="#E9EDFF" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="100" y2="100" />
                    <line stroke="#E9EDFF" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="600" y1="160" y2="160" />

                    {/* Primary MRR Area (Revealed via clipPath) */}
                    <path
                      d="M 0,160 Q 100,140 200,90 T 400,60 T 600,20 L 600,200 L 0,200 Z"
                      fill="url(#forestGrad)"
                      clipPath="url(#chartClip)"
                    />

                    {/* Primary MRR Line (stroke-dashoffset draw from left to right) */}
                    <motion.path
                      d="M 0,160 Q 100,140 200,90 T 400,60 T 600,20"
                      fill="none"
                      stroke="#1B3D35"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="800"
                      initial={{ strokeDashoffset: 800 }}
                      animate={isChartInView || shouldReduceMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: 800 }}
                      transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Expansion Secondary Area (Revealed via clipPath) */}
                    <path
                      d="M 0,185 Q 120,170 240,140 T 450,110 T 600,70 L 600,200 L 0,200 Z"
                      fill="url(#terraGrad)"
                      clipPath="url(#chartClip)"
                    />

                    {/* Expansion Secondary Line (stroke-dashoffset draw) */}
                    <motion.path
                      d="M 0,185 Q 120,170 240,140 T 450,110 T 600,70"
                      fill="none"
                      stroke="#95482E"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="800"
                      initial={{ strokeDashoffset: 800 }}
                      animate={isChartInView || shouldReduceMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: 800 }}
                      transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Key Point Dots */}
                    <motion.circle
                      cx="200"
                      cy="90"
                      fill="#1B3D35"
                      r="4"
                      initial={{ scale: 0 }}
                      animate={isChartInView || shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    />
                    <motion.circle
                      cx="400"
                      cy="60"
                      fill="#1B3D35"
                      r="4"
                      initial={{ scale: 0 }}
                      animate={isChartInView || shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: 0.8, duration: 0.3 }}
                    />
                    <motion.circle
                      cx="600"
                      cy="20"
                      fill="#1B3D35"
                      r="5"
                      initial={{ scale: 0 }}
                      animate={isChartInView || shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: 1.1, duration: 0.3 }}
                    />
                  </svg>
                </div>

                <div className="flex justify-between items-center text-xs text-[#717976] pt-2 border-t border-[#e9edff]">
                  {DASHBOARD_PREVIEW_DATA.chart.months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Table Container (5 Cols) */}
              <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#e2e4de] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#141b2b]">
                    Live Invoices
                  </h3>
                  <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#414846] mb-4">
                    Real-time automated clearing
                  </p>

                  <div className="divide-y divide-[#e9edff]">
                    {DASHBOARD_PREVIEW_DATA.recentInvoices.map((inv, idx) => (
                      <motion.div
                        key={inv.account}
                        initial={{ opacity: 0, x: 12 }}
                        animate={isChartInView || shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                        transition={{ delay: 0.2 + idx * 0.08, duration: 0.45 }}
                        className="py-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#141b2b]">{inv.account}</p>
                          <p className="text-[#717976]">{inv.plan}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#141b2b]">{inv.amount}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.statusClass}`}>
                            {inv.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e9edff] flex items-center justify-between text-xs text-[#1b3d35] font-semibold cursor-pointer group">
                  <span>View detailed general ledger</span>
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default DashboardPreview;
