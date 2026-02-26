"use client";

const questionCategories = [
  {
    label: "Revenue & Sales",
    color: "border-l-teal-500",
    questions: [
      "What was my total revenue across all channels last week?",
      "Compare this month's Amazon sales to last month",
      "What time of day do I get the most orders?",
    ],
  },
  {
    label: "Products & Inventory",
    color: "border-l-blue-500",
    questions: [
      "Which products are selling best on Flipkart this month?",
      "Which products are running low on stock?",
      "What's my inventory turnover rate for electronics?",
    ],
  },
  {
    label: "Customers",
    color: "border-l-violet-500",
    questions: [
      "Who are my top 10 customers by lifetime value?",
      "How many new customers did I get this week?",
      "Break down my customers: one-time vs repeat vs VIP",
    ],
  },
  {
    label: "Cross-Channel Intelligence",
    color: "border-l-emerald-500",
    questions: [
      "Where should I sell my wireless earbuds?",
      "Compare my Shopify vs Amazon performance",
      "Which products have the highest return rate on eBay?",
    ],
  },
];

export function ExampleQuestions() {
  return (
    <section id="questions" className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Try These
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Ask{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Anything
            </span>{" "}
            About Your Business
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From revenue breakdowns to customer segments to inventory alerts — Frax handles it all.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {questionCategories.map((cat, catIndex) => (
            <div key={catIndex} className="fade-up">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat.label}</h3>
              <div className="space-y-3">
                {cat.questions.map((question, qIndex) => (
                  <div
                    key={qIndex}
                    className={`flex items-center gap-4 rounded-xl border-l-4 ${cat.color} border border-slate-100 bg-white px-4 py-3 shadow-sm`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-700 font-medium">{question}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
