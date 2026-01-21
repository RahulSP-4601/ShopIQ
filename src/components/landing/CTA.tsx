"use client";

import Link from "next/link";

export function CTA() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Pricing cards */}
        <div className="text-center fade-up mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Simple Pricing
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
            Start free, <span className="text-indigo-600">scale as you grow</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            No hidden fees. No surprise charges. Just straightforward pricing that grows with your business.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="fade-up rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Starter</h3>
              <p className="text-sm text-slate-500 mt-1">Perfect for trying out ShopIQ</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">$0</span>
              <span className="text-slate-500">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["1 marketplace connection", "100 AI queries/month", "Basic analytics", "7-day data history", "Email support"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/connect"
              className="block w-full py-3 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Plan - Featured */}
          <div className="fade-up rounded-2xl border-2 border-indigo-500 bg-white p-8 shadow-xl relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Professional</h3>
              <p className="text-sm text-slate-500 mt-1">For growing multi-channel sellers</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-indigo-600">$49</span>
              <span className="text-slate-500">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["5 marketplace connections", "Unlimited AI queries", "Advanced analytics", "1-year data history", "Cross-channel reports", "Priority support", "Custom alerts"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg className="w-5 h-5 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/connect"
              className="block w-full py-3 text-center text-sm font-semibold text-white btn-primary rounded-lg"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="fade-up rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Enterprise</h3>
              <p className="text-sm text-slate-500 mt-1">For large-scale operations</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">Custom</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["Unlimited connections", "Unlimited queries", "Custom integrations", "Unlimited history", "Dedicated account manager", "SLA guarantee", "On-premise option", "Custom training"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="/contact"
              className="block w-full py-3 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* Bottom CTA banner */}
        <div className="fade-up mt-20">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-12 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to unify your e-commerce analytics?
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
                Join 10,000+ sellers who manage all their marketplaces from one dashboard.
                Start your free trial today.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/connect"
                  className="group flex h-14 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-slate-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Start Free Trial
                    <svg
                      className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
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
                </Link>
                <a
                  href="/contact"
                  className="flex h-14 items-center justify-center rounded-xl border border-slate-600 px-8 text-base font-semibold text-white transition-all duration-300 hover:bg-slate-800 hover:border-slate-500"
                >
                  Schedule a Demo
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
