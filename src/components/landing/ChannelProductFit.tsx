"use client";

const fitScores = [
  { channel: "Amazon", score: 92, recommendation: "EXPAND", recColor: "text-emerald-600 bg-emerald-50" },
  { channel: "Shopify", score: 85, recommendation: "ACTIVE", recColor: "text-slate-600 bg-slate-50" },
  { channel: "Flipkart", score: 74, recommendation: "REPRICE", recColor: "text-violet-600 bg-violet-50" },
  { channel: "eBay", score: 61, recommendation: "MONITOR", recColor: "text-slate-600 bg-slate-50" },
  { channel: "Etsy", score: 23, recommendation: "DEPRIORITIZE", recColor: "text-slate-500 bg-slate-50" },
];

const signals = [
  { name: "Revenue Velocity", desc: "Revenue per day on this channel" },
  { name: "Unit Velocity", desc: "Units sold per day" },
  { name: "Price Position", desc: "Your price vs market average" },
  { name: "Sales Trend", desc: "Upward or downward momentum" },
  { name: "Trend Consistency", desc: "Reliability of the trend (R²)" },
  { name: "Inventory Turnover", desc: "How fast stock moves" },
  { name: "Return Rate", desc: "% of orders returned" },
];

const recommendations = [
  { type: "EXPAND", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", desc: "List on a new marketplace", example: "Earbuds score 92 for Amazon — list them there" },
  { type: "CONNECT", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50", desc: "High potential on unconnected channel", example: "Electronics have strong demand on Amazon" },
  { type: "RESTOCK", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", desc: "Inventory critically low", example: "Only 3 units left on Flipkart — restock now" },
  { type: "REPRICE", color: "bg-violet-500", textColor: "text-violet-700", bgLight: "bg-violet-50", desc: "Price misaligned with market", example: "18% above Etsy market average" },
  { type: "DEPRIORITIZE", color: "bg-slate-400", textColor: "text-slate-600", bgLight: "bg-slate-50", desc: "Underperforming on this channel", example: "Laptop Bag scores 18/100 on Snapdeal" },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} rounded-full h-2 transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono text-sm font-semibold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>
        {score}
      </span>
    </div>
  );
}

export function ChannelProductFit() {
  return (
    <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-white via-teal-50/30 to-white relative overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #14b8a6 1px, transparent 0)',
        backgroundSize: '20px 20px',
      }} />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Two-column: text left, score card right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left column — heading + description + signals */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="fade-up inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Only on Frame
            </div>
            <p className="fade-up text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              Exclusive Feature
            </p>
            <h2 className="fade-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Know Exactly{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Where to Sell What</span>
            </h2>
            <p className="fade-up mt-6 text-lg text-slate-600 max-w-lg">
              Frame&apos;s Channel-Product Fit Engine analyzes 7 performance signals to score how well each product fits each marketplace — then gives you specific, actionable recommendations.
            </p>

            {/* 7 Signals compact grid */}
            <div className="fade-up mt-8 w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">7 Performance Signals</p>
              <div className="grid grid-cols-2 gap-2">
                {signals.map((signal, i) => (
                  <div key={signal.name} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5 hover:border-teal-200 transition-colors duration-200">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-teal-50 text-teal-600 text-[10px] font-bold shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{signal.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{signal.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — score card mockup */}
          <div className="fade-up">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Wireless Earbuds Pro</h3>
                    <p className="text-sm text-slate-500">SKU: WEP-2024 · Connected on: Shopify, Flipkart</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-xs font-medium text-teal-700">Live Analysis</span>
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="px-6 py-5">
                <div className="space-y-3.5">
                  {fitScores.map((item) => (
                    <div key={item.channel} className="flex items-center gap-4">
                      <span className="w-16 text-sm font-medium text-slate-700">{item.channel}</span>
                      <ScoreBar score={item.score} />
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${item.recColor}`}>
                        {item.recommendation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insight */}
              <div className="px-6 py-4 border-t border-slate-100 bg-emerald-50/50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <p className="text-sm text-emerald-800">
                    Estimated uplift from expanding to Amazon: <span className="font-semibold">+$2,600/mo</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Recommendation types — full width below */}
        <div className="fade-up">
          <h3 className="text-center text-lg font-semibold text-slate-900 mb-8">5 Actionable Recommendation Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {recommendations.map((rec) => (
              <div key={rec.type} className={`p-4 rounded-xl ${rec.bgLight} border border-transparent hover:shadow-md transition-all duration-200`}>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full ${rec.color} text-white text-[10px] font-bold uppercase mb-2`}>
                  {rec.type}
                </div>
                <p className={`text-sm font-medium ${rec.textColor} mb-1`}>{rec.desc}</p>
                <p className="text-[11px] text-slate-500 italic">&ldquo;{rec.example}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
