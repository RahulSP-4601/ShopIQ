"use client";

const features = [
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
      />
    ),
    title: "Unified Analytics Dashboard",
    description:
      "See revenue, orders, and inventory across all marketplaces in one view. No more switching between dashboards.",
    highlight: "All channels in one place",
    color: "indigo",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
    title: "AI-Powered Insights",
    description:
      "Ask questions in plain English. Our AI analyzes your data across all platforms and gives actionable recommendations.",
    highlight: "Natural language queries",
    color: "purple",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    ),
    title: "Cross-Channel Comparison",
    description:
      "Compare performance between Amazon, Flipkart, Meesho, and others. Identify which products work best where.",
    highlight: "Data-driven decisions",
    color: "cyan",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    ),
    title: "Inventory Intelligence",
    description:
      "Track stock levels across all channels. Get alerts before you run out and recommendations for optimal allocation.",
    highlight: "Never miss a sale",
    color: "amber",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    ),
    title: "Automated Reports",
    description:
      "Get daily, weekly, and monthly reports delivered automatically. Track KPIs, trends, and growth metrics effortlessly.",
    highlight: "Insights delivered to you",
    color: "rose",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
    title: "Enterprise Security",
    description:
      "SOC 2 compliant, end-to-end encryption, and read-only API access. Your data stays secure and private.",
    highlight: "Bank-grade protection",
    color: "emerald",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 mb-4 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Powerful Features
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-5xl">
            Everything you need to <span className="text-purple-600">scale your business</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Built for multi-channel sellers who want to make data-driven decisions without complexity
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

const colorClasses: Record<string, { bg: string; icon: string; badge: string; badgeText: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", badge: "bg-indigo-50 border-indigo-200", badgeText: "text-indigo-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", badge: "bg-purple-50 border-purple-200", badgeText: "text-purple-700" },
  cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", badge: "bg-cyan-50 border-cyan-200", badgeText: "text-cyan-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", badge: "bg-amber-50 border-amber-200", badgeText: "text-amber-700" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", badge: "bg-rose-50 border-rose-200", badgeText: "text-rose-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-50 border-emerald-200", badgeText: "text-emerald-700" },
};

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const colors = colorClasses[feature.color] || colorClasses.indigo;

  return (
    <div
      className="fade-up group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} mb-5 transition-colors duration-300`}>
        <svg
          className={`h-6 w-6 ${colors.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {feature.icon}
        </svg>
      </div>

      <div className="mb-3">
        <span className={`inline-block px-2 py-0.5 text-xs font-medium ${colors.badgeText} ${colors.badge} border rounded-full`}>
          {feature.highlight}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {feature.title}
      </h3>
      <p className="text-slate-600 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}
