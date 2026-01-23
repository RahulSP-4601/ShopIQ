"use client";

import Link from "next/link";

const plans = [
  {
    name: "Starter",
    description: "Perfect for trying out ShopIQ",
    price: "$0",
    period: "/month",
    features: [
      "1 marketplace connection",
      "100 AI queries/month",
      "Basic analytics",
      "7-day data history",
      "Email support",
    ],
    cta: "Get Started Free",
    href: "/connect",
    featured: false,
    color: "from-slate-600 to-slate-700",
    checkColor: "text-teal-500",
  },
  {
    name: "Professional",
    description: "For growing multi-channel sellers",
    price: "$49",
    period: "/month",
    features: [
      "5 marketplace connections",
      "Unlimited AI queries",
      "Advanced analytics",
      "1-year data history",
      "Cross-channel reports",
      "Priority support",
      "Custom alerts",
    ],
    cta: "Start 14-Day Free Trial",
    href: "/connect",
    featured: true,
    color: "from-teal-500 to-emerald-500",
    checkColor: "text-teal-400",
  },
  {
    name: "Enterprise",
    description: "For large-scale operations",
    price: "Custom",
    period: "",
    features: [
      "Unlimited connections",
      "Unlimited queries",
      "Custom integrations",
      "Unlimited history",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise option",
      "Custom training",
    ],
    cta: "Contact Sales",
    href: "/contact",
    featured: false,
    color: "from-violet-500 to-purple-500",
    checkColor: "text-violet-500",
  },
];

export function CTA() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Start free and scale as your business grows. No hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`fade-up relative rounded-2xl p-8 transition-all duration-300 ${
                plan.featured
                  ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-xl shadow-teal-500/25 scale-105 z-10"
                  : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Popular badge */}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 text-xs font-bold text-teal-600 bg-white rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3
                  className={`text-lg font-bold ${
                    plan.featured ? "text-white" : "text-slate-900"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    plan.featured ? "text-teal-100" : "text-slate-500"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={`text-4xl font-bold ${
                    plan.featured ? "text-white" : "text-slate-900"
                  }`}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    className={plan.featured ? "text-teal-100" : "text-slate-500"}
                  >
                    {plan.period}
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 text-sm ${
                      plan.featured ? "text-teal-50" : "text-slate-600"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 shrink-0 ${
                        plan.featured ? "text-white" : plan.checkColor
                      }`}
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
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <Link
                href={plan.href}
                className={`block w-full py-3 text-center text-sm font-semibold rounded-xl transition-all duration-200 ${
                  plan.featured
                    ? "bg-white text-teal-600 hover:bg-teal-50 shadow-lg"
                    : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg`
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom CTA banner */}
        <div className="fade-up mt-24">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-12 text-center relative overflow-hidden">
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
                <Link
                  href="/connect"
                  className="group flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/25"
                >
                  Start Free Trial
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
                </Link>
                <a
                  href="#demo"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-600 px-8 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 hover:border-slate-500"
                >
                  Watch Demo
                </a>
              </div>

              {/* Trust points */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                {["14-day free trial", "No credit card required", "Cancel anytime"].map(
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
    </section>
  );
}
