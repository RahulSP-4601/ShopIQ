"use client";

const briefings = [
  { time: "07:00 UTC", name: "Morning Coffee", freq: "Every day", desc: "Yesterday's performance snapshot" },
  { time: "Monday 00:00", name: "Weekly Trends", freq: "Every Monday", desc: "Full week analysis with growth metrics" },
  { time: "Bi-Weekly", name: "Momentum Report", freq: "Every 2 weeks", desc: "Multi-week patterns and trends" },
  { time: "1st of Month", name: "Monthly Strategy", freq: "Monthly", desc: "Comprehensive 200-300 word review" },
];

export function ReportsAlerts() {
  return (
    <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Zero Effort
          </div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Automation
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Insights Delivered.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Automatically.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Get daily briefings, weekly trend analysis, and real-time alerts — all delivered to your inbox without lifting a finger.
          </p>
        </div>

        {/* Two columns */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left - Email briefing mockup */}
          <div className="fade-up">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Email Briefings</h3>

            {/* Email mockup */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden mb-6" style={{ transform: 'perspective(1000px) rotateY(-2deg)' }}>
              {/* Email header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">From:</span> Frax &lt;frax@frame.com&gt;
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700">Subject:</span> Your Morning Briefing — Feb 25
                </div>
              </div>

              {/* Email body */}
              <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
                <p className="text-slate-500">Good morning! Here&apos;s yesterday&apos;s snapshot:</p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Revenue</span>
                    <span className="font-semibold text-slate-900">$6,847 <span className="text-emerald-600 text-xs">+11%</span></span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Orders</span>
                    <span className="font-medium text-slate-800">94 across 4 channels</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Top Seller</span>
                    <span className="font-medium text-slate-800">Earbuds Pro — 34 units</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Summer Dress (Flipkart): 3 units left
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Amazon conversion rate needs attention
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600" aria-hidden="true">
                    Open Full Report
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Briefing schedule */}
            <div className="grid grid-cols-2 gap-3">
              {briefings.map((b) => (
                <div key={b.name} className="p-3 rounded-xl border border-slate-100 bg-white">
                  <div className="text-[10px] font-mono text-teal-600 mb-1">{b.time}</div>
                  <div className="text-sm font-semibold text-slate-800">{b.name}</div>
                  <div className="text-[11px] text-slate-500">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Alerts */}
          <div className="fade-up">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Proactive Alerts</h3>

            {/* Alert stack */}
            <div className="space-y-3 mb-8">
              {/* Critical */}
              <div className="rounded-xl border border-red-200 bg-white shadow-md overflow-hidden">
                <div className="flex">
                  <div className="w-1 bg-red-500 shrink-0" />
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs font-bold text-red-700 uppercase">Stockout Risk</span>
                      <span className="text-[10px] text-red-500 font-medium ml-auto">Critical</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Summer Dress</span> · Flipkart
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      3 units left · Selling 8/day · Stockout in ~9 hours
                    </p>
                    <button className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                      Restock Now →
                    </button>
                  </div>
                </div>
              </div>

              {/* High */}
              <div className="rounded-xl border border-amber-200 bg-white shadow-md overflow-hidden">
                <div className="flex">
                  <div className="w-1 bg-amber-500 shrink-0" />
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-amber-700 uppercase">Demand Surge</span>
                      <span className="text-[10px] text-amber-500 font-medium ml-auto">High</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Wireless Earbuds</span> · Amazon
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Weekly velocity: 45 → 112 units (+149%)
                    </p>
                    <button className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors">
                      Increase Allocation →
                    </button>
                  </div>
                </div>
              </div>

              {/* Medium */}
              <div className="rounded-xl border border-blue-200 bg-white shadow-md overflow-hidden">
                <div className="flex">
                  <div className="w-1 bg-blue-500 shrink-0" />
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-blue-700 uppercase">Return Anomaly</span>
                      <span className="text-[10px] text-blue-500 font-medium ml-auto">Medium</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Laptop Bag</span> · eBay
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Return rate: 4% → 12% this week
                    </p>
                    <button className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                      Investigate Listing →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Key messaging */}
            <div className="space-y-3">
              {[
                { title: "Hourly monitoring", desc: "Stockouts, demand surges, revenue anomalies, return patterns" },
                { title: "Smart deduplication", desc: "Same alert never fires twice" },
                { title: "Severity classification", desc: "Low / Medium / High / Critical with clear action items" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <span className="text-sm text-slate-500"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
