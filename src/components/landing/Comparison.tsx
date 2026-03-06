"use client";

const comparisons = [
  {
    capability: "Multi-marketplace support",
    traditional: "Single platform focus (Shopify OR Amazon)",
    frame: "9 marketplaces unified in one view",
  },
  {
    capability: "Data consolidation",
    traditional: "Manual CSV exports + spreadsheets",
    frame: "Automatic real-time sync + unified data model",
  },
  {
    capability: "Analytics interface",
    traditional: "Complex dashboards with 50+ tabs",
    frame: "Conversational AI — just ask in plain English",
  },
  {
    capability: "Cross-channel intelligence",
    traditional: "Not available",
    frame: "Channel-Product Fit engine (7 signals, scored 0-100)",
  },
  {
    capability: "Automated reporting",
    traditional: "Manual report building",
    frame: "Daily, weekly, bi-weekly, monthly — auto-delivered",
  },
  {
    capability: "Proactive alerts",
    traditional: "Discover problems after they happen",
    frame: "Hourly monitoring for stockouts, surges, anomalies",
  },
  {
    capability: "AI memory & learning",
    traditional: "Static reports that never evolve",
    frame: "Frax remembers your business and gets smarter",
  },
  {
    capability: "Setup time",
    traditional: "Days to weeks of configuration",
    frame: "2 minutes — OAuth connect and go",
  },
  {
    capability: "Typical cost",
    traditional: "₹8,000 – ₹80,000+/month",
    frame: "Starting at ₹999/month",
  },
];

export function Comparison() {
  return (
    <section className="py-12 md:py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-3xl mx-auto mb-12">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Comparison
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Traditional Analytics{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-500">vs.</span>{" "}
            Frame
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            See why multi-channel sellers are replacing dashboards, spreadsheets, and expensive tools with one AI conversation.
          </p>
        </div>

        {/* Comparison table */}
        <div className="fade-up overflow-hidden rounded-2xl border border-slate-200 shadow-lg" role="table" aria-label="Traditional Analytics vs Frame comparison">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr] md:grid-cols-[1.2fr_1fr_1fr] bg-slate-50 border-b border-slate-200" role="row">
            <div className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider" role="columnheader">
              Capability
            </div>
            <div className="p-4 text-sm font-semibold text-slate-400 uppercase tracking-wider text-center" role="columnheader">
              Traditional Tools
            </div>
            <div className="p-4 text-sm font-semibold text-teal-700 uppercase tracking-wider text-center bg-teal-50/50" role="columnheader">
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Frame
              </div>
            </div>
          </div>

          {/* Table rows */}
          {comparisons.map((row, index) => (
            <div
              key={index}
              role="row"
              className={`grid grid-cols-[1fr_1fr_1fr] md:grid-cols-[1.2fr_1fr_1fr] ${
                index < comparisons.length - 1 ? "border-b border-slate-100" : ""
              } hover:bg-slate-50/50 transition-colors`}
            >
              <div className="p-4 text-sm font-medium text-slate-800" role="rowheader">
                {row.capability}
              </div>
              <div className="p-4 text-sm text-slate-500 text-center flex items-center justify-center gap-2" role="cell">
                <svg className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-left">{row.traditional}</span>
              </div>
              <div className="p-4 text-sm text-teal-800 font-medium text-center bg-teal-50/30 flex items-center justify-center gap-2" role="cell">
                <svg className="w-4 h-4 text-teal-500 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-left">{row.frame}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
