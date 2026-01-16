"use client";

const features = [
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    ),
    color: "emerald",
    title: "Ask in Plain English",
    description:
      "No complex queries or filters. Just ask questions like you would to a human analyst and get instant answers.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
    color: "emerald",
    title: "Revenue Analytics",
    description:
      "Track sales trends, compare periods, identify top performers, and understand what drives your revenue growth.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    ),
    color: "emerald",
    title: "Product Performance",
    description:
      "Discover your best sellers, identify underperformers, and get recommendations to optimize your product mix.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
    color: "emerald",
    title: "Customer Insights",
    description:
      "Understand customer behavior, segment your audience, and identify your most valuable customers.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    color: "emerald",
    title: "Auto-Generated Reports",
    description:
      "Get weekly and monthly reports delivered automatically with key metrics and actionable recommendations.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
    color: "emerald",
    title: "Real-Time Sync",
    description:
      "Your data syncs automatically from Shopify. Always up-to-date insights without manual exports.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-white" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 mb-4">
            Features
          </div>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Everything you need to
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {" "}
              understand your business
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Powerful analytics made simple with conversational AI
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  return (
    <div
      className="fade-up group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 hover:border-slate-200"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-${feature.color}-100 to-${feature.color}-50 shadow-lg shadow-${feature.color}-100 transition-transform duration-300 group-hover:scale-110`}
        >
          <svg
            className={`h-7 w-7 text-${feature.color}-600`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {feature.icon}
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">
          {feature.title}
        </h3>
        <p className="mt-2 text-slate-600 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
}
