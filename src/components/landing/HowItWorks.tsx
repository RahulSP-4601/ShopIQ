"use client";

const steps = [
  {
    step: "01",
    title: "Connect Your Stores",
    description: "One-click OAuth integration with Shopify, Amazon, Flipkart, Meesho, and 50+ marketplaces. No API keys or manual setup.",
    features: ["Secure OAuth 2.0", "Read-only access", "Instant sync"],
    color: "cyan",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    ),
  },
  {
    step: "02",
    title: "Ask Anything",
    description: "Use natural language to query your data. Compare channels, analyze trends, and get recommendations—all in plain English.",
    features: ["Natural language AI", "Cross-channel analysis", "Smart recommendations"],
    color: "indigo",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
  },
  {
    step: "03",
    title: "Grow Your Business",
    description: "Get actionable insights delivered daily. Know exactly where to focus your efforts to maximize sales across all channels.",
    features: ["Daily insights", "Revenue optimization", "Inventory alerts"],
    color: "emerald",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 mb-4 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Simple Setup
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
            Get started in <span className="text-amber-600">3 simple steps</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Connect your first marketplace in under 2 minutes. No technical setup required.
          </p>
        </div>

        <div className="mt-20 relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((item, index) => (
              <StepCard key={index} item={item} index={index} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fade-up mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["cyan", "indigo", "emerald"].map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white ${
                      color === "cyan" ? "bg-cyan-500" : color === "indigo" ? "bg-indigo-500" : "bg-emerald-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">2,847 sellers</span> started this week
              </span>
            </div>
            <a
              href="/connect"
              className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const stepColorClasses: Record<string, { bg: string; icon: string; pill: string; pillText: string; step: string }> = {
  cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", pill: "bg-cyan-50 border-cyan-200", pillText: "text-cyan-700", step: "text-cyan-100" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", pill: "bg-indigo-50 border-indigo-200", pillText: "text-indigo-700", step: "text-indigo-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", pill: "bg-emerald-50 border-emerald-200", pillText: "text-emerald-700", step: "text-emerald-100" },
};

function StepCard({ item, index }: { item: (typeof steps)[0]; index: number }) {
  const colors = stepColorClasses[item.color] || stepColorClasses.indigo;

  return (
    <div
      className="fade-up relative"
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <div className="group rounded-2xl bg-white border border-slate-200 p-8 transition-all duration-300 hover:shadow-xl hover:border-slate-300">
        {/* Step number */}
        <div className="flex items-center justify-between mb-6">
          <span className={`text-5xl font-bold ${colors.step} transition-colors`}>
            {item.step}
          </span>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} transition-colors`}>
            <svg
              className={`h-6 w-6 ${colors.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {item.icon}
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-slate-900 mb-3">
          {item.title}
        </h3>
        <p className="text-slate-600 leading-relaxed mb-5">
          {item.description}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2">
          {item.features.map((feature, i) => (
            <span
              key={i}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors.pill} ${colors.pillText}`}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
