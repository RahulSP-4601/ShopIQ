"use client";

import { useState } from "react";
import { RequestTrialModal } from "./RequestTrialModal";

const features = [
  "2 marketplace connections included",
  "Unlimited AI queries",
  "Advanced analytics & reports",
  "1-year data history",
  "Cross-channel insights",
  "Priority support",
];

export function CTA() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="pricing" className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            Pricing
          </p>
          <p className="mt-4 text-lg text-slate-600">
            One plan. All features. Scale as you grow.
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="w-full max-w-sm mx-auto fade-up">
          <div className="relative group">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-3 bg-gradient-to-b from-teal-400/20 to-emerald-400/10 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Card shell */}
            <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-slate-900/[0.04] bg-white">

              {/* ── Gradient header ── */}
              <div className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 px-8 pt-9 pb-16 text-center">
                {/* Decorative light spots */}
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.08] rounded-full blur-2xl" />
                <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-300/15 rounded-full blur-2xl" />
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-80 h-32 bg-white/[0.04] rounded-full blur-3xl" />

                <div className="relative z-10">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.12] backdrop-blur-sm ring-1 ring-white/20 mb-5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[11px] font-bold text-white/95 uppercase tracking-widest">
                      Best Value
                    </span>
                  </div>

                  {/* Plan name */}
                  <h3 className="text-2xl font-extrabold text-white mb-6 tracking-wide">
                    Frame Pro
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-6xl font-extrabold text-white/90">₹</span>
                    <span className="text-7xl font-extrabold text-white tracking-tighter leading-none">
                      999
                    </span>
                    <span className="text-lg font-semibold text-white/60 ml-1 self-end mb-1">/month</span>
                  </div>

                  <p className="mt-5 text-base font-semibold text-white/80">
                    + ₹449/mo per additional marketplace
                  </p>
                </div>

                {/* Curve — pinned to bottom edge, no gap */}
                <div className="absolute left-0 right-0 bottom-0 translate-y-px">
                  <svg viewBox="0 0 400 24" fill="none" className="w-full block" preserveAspectRatio="none">
                    <path d="M0 24V6C66.7 20 133.3 24 200 24s133.3-4 200-18v18H0z" fill="white" />
                  </svg>
                </div>
              </div>

              {/* ── White body ── */}
              <div className="px-8 pb-8 pt-4">
                {/* Feature heading */}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                  Everything included
                </p>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3"
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:-translate-y-0.5 cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-2">
                    Start Free Trial
                    <svg
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </button>

                {/* Trust line */}
                <p className="mt-4 text-center text-xs text-slate-400">
                  30-day free trial · No credit card · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA banner */}
        <div className="fade-up mt-24">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 sm:p-8 md:p-12 text-center relative overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-lg" style={{ color: '#ffffff' }}>
                Ready to unify your e-commerce analytics?
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
                Join 10,000+ sellers who manage all their marketplaces from one
                dashboard.
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="group flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25"
                >
                  Request a Free Trial
                  <svg
                    className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
                <a
                  href="#demo"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-600 px-8 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 hover:border-slate-500"
                >
                  Watch Demo
                </a>
              </div>

              {/* Trust points */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                {["30-day free trial", "No credit card required", "Cancel anytime"].map(
                  (item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-teal-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Trial Modal */}
      <RequestTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
