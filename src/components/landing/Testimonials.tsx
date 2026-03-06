"use client";

const testimonials = [
  {
    quote: "I used to spend 2 hours every morning checking 4 different dashboards. Now I just ask Frax 'How did yesterday go?' and get the full picture in 10 seconds. The daily email briefings alone are worth the subscription.",
    author: "Ankit Mehta",
    role: "Founder, Urban Craft Co.",
    marketplaces: ["Shopify", "Flipkart", "Amazon"],
    result: "Saved 12+ hours/week on reporting",
    color: "from-teal-500 to-emerald-500",
  },
  {
    quote: "The Channel-Product Fit feature told me to expand my electronics line to eBay. I did, and it's now my third-highest revenue channel. No other tool gave me that recommendation — I wouldn't have thought of it myself.",
    author: "Priya Sharma",
    role: "E-Commerce Manager, TechNova",
    marketplaces: ["Amazon", "Flipkart", "eBay", "Shopify"],
    result: "+32% revenue from channel expansion",
    color: "from-violet-500 to-purple-500",
  },
  {
    quote: "Frame caught a stockout risk on my best-selling product 8 hours before it would have run out. That single alert saved me an estimated ₹2.4 lakh in lost sales. The proactive alerts are genuinely a game-changer.",
    author: "Rajesh Kumar",
    role: "Operations Head, StyleVault",
    marketplaces: ["Flipkart", "Amazon", "Shopify"],
    result: "Prevented 3 stockouts in first month",
    color: "from-blue-500 to-indigo-500",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto mb-12">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Loved by Sellers{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Everywhere</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From solo founders to growing brands — here&apos;s what our sellers say about Frame.
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="fade-up relative rounded-2xl bg-white border border-slate-100 p-8 hover:border-slate-200 hover:shadow-xl transition-all duration-300"
            >
              {/* Star rating */}
              <StarRating />

              {/* Quote */}
              <p className="mt-4 text-slate-600 leading-relaxed text-sm italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Result badge */}
              <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${t.color} text-white text-xs font-semibold`}>
                {t.result}
              </div>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-semibold text-sm shadow-lg`}>
                  {t.author.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{t.author}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </div>

              {/* Marketplace badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.marketplaces.map((mp) => (
                  <span key={mp} className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-500">
                    {mp}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
