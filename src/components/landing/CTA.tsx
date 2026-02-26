"use client";

import { useState } from "react";
import { RequestTrialModal } from "./RequestTrialModal";

const features = [
  "2 marketplace connections included",
  "Unlimited AI queries with Frax",
  "All 11 analytics tools",
  "Channel-Product Fit recommendations",
  "Automated daily, weekly & monthly reports",
  "Proactive stockout & demand alerts",
  "1-year data history",
  "AES-256 encryption + SOC 2 compliance",
  "Priority support",
];

const pricingTiers = [
  { marketplaces: "2 (included)", cost: "₹999", perMp: "₹500" },
  { marketplaces: "3", cost: "₹1,448", perMp: "₹483" },
  { marketplaces: "4", cost: "₹1,897", perMp: "₹474" },
  { marketplaces: "5", cost: "₹2,346", perMp: "₹469" },
  { marketplaces: "6", cost: "₹2,795", perMp: "₹466" },
  { marketplaces: "7", cost: "₹3,244", perMp: "₹463" },
  { marketplaces: "8", cost: "₹3,693", perMp: "₹462" },
  { marketplaces: "9 (all)", cost: "₹4,142", perMp: "₹460" },
];

const highlights = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "No Hidden Fees",
    desc: "One transparent price. No per-query charges, no feature gates.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "Scale Freely",
    desc: "Add marketplaces as you grow. Price drops per channel.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Enterprise Security",
    desc: "AES-256 encryption, SOC 2 certified, GDPR compliant.",
  },
];

export function CTA() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <section id="pricing" className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Two-column: text left, card right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column — headline + highlights + calculator */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <p className="fade-up text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="fade-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              One Plan.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">All Features.</span>{" "}
              <br className="hidden sm:block" />
              Scale As You Grow.
            </h2>
            <p className="fade-up mt-6 text-lg text-slate-600 max-w-lg">
              No tiers to compare. No features locked behind paywalls. Every seller gets the complete platform.
            </p>

            {/* Highlight cards */}
            <div className="fade-up mt-8 space-y-4 w-full max-w-lg">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-slate-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                    {h.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{h.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing calculator */}
            <div className="fade-up mt-6 w-full max-w-lg">
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                aria-expanded={showCalculator}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008H18v-.008zm0 2.25h.008v.008H18V13.5zM9.75 9h4.5V6.75a2.25 2.25 0 00-4.5 0V9z" />
                </svg>
                Calculate your cost
                <svg className={`w-4 h-4 transition-transform duration-200 ${showCalculator ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCalculator && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700">Pricing Calculator</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pricingTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
                        <span className="text-slate-600">{tier.marketplaces}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-slate-900">{tier.cost}/mo</span>
                          <span className="text-xs text-slate-400">{tier.perMp}/marketplace</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-teal-50/50 border-t border-slate-100">
                    <p className="text-xs text-teal-700">The more you connect, the lower your per-marketplace cost — and the smarter Frax gets.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column — pricing card */}
          <div className="fade-up w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
            <div className="relative group">
              {/* Ambient glow behind card */}
              <div className="absolute -inset-3 bg-gradient-to-b from-teal-400/20 to-emerald-400/10 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Card shell */}
              <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/[0.04] bg-white">

                {/* Gradient header */}
                <div className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 px-8 pt-9 pb-16 text-center">
                  <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.08] rounded-full blur-2xl" />
                  <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-300/15 rounded-full blur-2xl" />
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-80 h-32 bg-white/[0.04] rounded-full blur-3xl" />

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.12] backdrop-blur-sm ring-1 ring-white/20 mb-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      <span className="text-[11px] font-bold text-white/95 uppercase tracking-widest">
                        Most Popular
                      </span>
                    </div>

                    <h3 className="text-2xl font-extrabold text-white mb-6 tracking-wide">
                      Frame Pro
                    </h3>

                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-5xl font-extrabold text-white/90">₹</span>
                      <span className="text-6xl font-extrabold text-white tracking-tighter leading-none">
                        999
                      </span>
                      <span className="text-lg font-semibold text-white/60 ml-1 self-end mb-1">/month</span>
                    </div>

                    <p className="mt-3 text-sm text-white/70">~$12/month</p>
                    <p className="mt-2 text-base font-semibold text-white/80">
                      + ₹449/mo per additional marketplace
                    </p>
                  </div>

                  <div className="absolute left-0 right-0 bottom-0 translate-y-px">
                    <svg viewBox="0 0 400 24" fill="none" className="w-full block" preserveAspectRatio="none">
                      <path d="M0 24V6C66.7 20 133.3 24 200 24s133.3-4 200-18v18H0z" fill="white" />
                    </svg>
                  </div>
                </div>

                {/* White body */}
                <div className="px-8 pb-8 pt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                    Everything included
                  </p>

                  <ul className="space-y-2.5 mb-8">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="group w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Start Your 30-Day Free Trial
                      <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </button>

                  <p className="mt-4 text-center text-xs text-slate-400">
                    No credit card required · Full access · Cancel anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA banner */}
        <div className="fade-up mt-24">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
                Ready to See Your Business Clearly?
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
                Join 10,000+ sellers who replaced spreadsheets and fragmented dashboards with one AI-powered command center.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25"
                >
                  Start Free Trial
                  <svg className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <a
                  href="#demo"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-600 px-8 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 hover:border-slate-500"
                >
                  See It In Action
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
                {["30-day free trial", "No credit card", "Cancel anytime", "SOC 2 Certified"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RequestTrialModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
