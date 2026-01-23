"use client";

const steps = [
  {
    number: "01",
    title: "Connect Your Stores",
    description: "One-click OAuth integration with Shopify, Amazon, Flipkart, Meesho, and 50+ marketplaces. No API keys needed.",
    features: ["Secure OAuth 2.0", "Read-only access", "Instant sync"],
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-500",
  },
  {
    number: "02",
    title: "Ask Anything",
    description: "Use natural language to query your data. Compare channels, analyze trends, and get recommendations instantly.",
    features: ["Natural language AI", "Cross-channel analysis", "Smart recommendations"],
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500",
  },
  {
    number: "03",
    title: "Grow Your Business",
    description: "Get actionable insights delivered daily. Know exactly where to focus your efforts to maximize sales.",
    features: ["Daily insights", "Revenue optimization", "Inventory alerts"],
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Get started in minutes
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Connect your first marketplace in under 2 minutes. No technical setup required.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-20 relative">
          {/* Connection line - desktop only */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-violet-200 to-orange-200" />

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="fade-up relative"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Step number */}
                <div className="flex items-center justify-center lg:justify-start mb-8">
                  <div className="relative">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${step.bgColor} text-white font-bold text-lg shadow-lg`}>
                      {step.number}
                    </div>
                    {/* Glow effect */}
                    <div className={`absolute inset-0 rounded-full ${step.bgColor} opacity-20 blur-xl`} />
                  </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {step.description}
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2">
                    {step.features.map((feature, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${step.color} text-white`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="fade-up mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  "bg-teal-500",
                  "bg-violet-500",
                  "bg-orange-500",
                ].map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-xs font-medium text-white`}
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
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/25"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
