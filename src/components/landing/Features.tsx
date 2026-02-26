"use client";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "All Channels, One View",
    description: "Revenue, orders, inventory, and customers from every marketplace — unified into one conversational interface. Stop switching between 7 tabs.",
    microStat: "Replaces ~3 hours of daily manual reporting",
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: "Ask in English, Get Numbers",
    description: "Frax understands natural language and has 11 specialized analytics tools. Ask 'How did my electronics do on Amazon this month?' and get a specific, data-backed answer in seconds.",
    microStat: "11 analytics tools · Unlimited queries",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6a2.25 2.25 0 01-2.25-2.25v-1.5M12 9v6m3-3H9" />
      </svg>
    ),
    title: "Know Where to Sell What",
    description: "Proprietary 7-signal scoring engine rates every product's fit on every marketplace (0-100). Get EXPAND, RESTOCK, REPRICE, and DEPRIORITIZE recommendations backed by real data.",
    microStat: "Only available on Frame",
    badge: "Exclusive",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    title: "Never Miss a Stockout",
    description: "Hourly monitoring across all channels. Proactive alerts for stockout risks, demand surges, and return anomalies — classified by severity and delivered before they impact revenue.",
    microStat: "Hourly checks · 4 severity levels",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: "Insights in Your Inbox",
    description: "Daily morning briefings, weekly trend analysis, bi-weekly momentum reports, and monthly strategic reviews — delivered automatically. Plus on-demand report generation inside the app.",
    microStat: "4 report cadences · Zero manual effort",
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Bank-Grade Security",
    description: "AES-256-GCM token encryption, HMAC-SHA256 webhook verification, HTTP-only JWT sessions, automatic PII cleanup, and GDPR-compliant data handling. Read-only access — Frame never modifies your data.",
    microStat: "SOC 2 Certified · GDPR Compliant",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
];

export function Features() {
  return (
    <section id="features" className="py-12 md:py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Built for Sellers Who{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Think in Data</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every feature designed to replace hours of manual work with seconds of intelligent automation.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="fade-up group relative p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Badge */}
              {"badge" in feature && feature.badge && (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-violet-100 text-violet-700">
                  {feature.badge}
                </span>
              )}

              {/* Icon */}
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor} ${feature.iconColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-3">
                {feature.description}
              </p>

              {/* Micro-stat */}
              <p className="text-xs font-medium text-slate-500">{feature.microStat}</p>

              {/* Hover gradient line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
