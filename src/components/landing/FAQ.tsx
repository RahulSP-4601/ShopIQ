"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How does the 30-day free trial work?",
    a: "Sign up, connect your marketplaces, and get full access to every feature — unlimited AI queries, all reports, all analytics tools. No credit card required. At the end of 30 days, choose to continue with a paid plan or your account pauses (no data is deleted).",
  },
  {
    q: "Does Frame modify or write to my marketplace stores?",
    a: "No. Frame uses strictly read-only API access. We sync your orders, products, and inventory data for analytics purposes only. We never create, update, or delete anything on your marketplaces.",
  },
  {
    q: "How long does setup take?",
    a: "Under 2 minutes. Click \"Connect\", authorize via OAuth on your marketplace, and Frame begins syncing immediately. No API keys to copy, no webhooks to configure manually, no technical setup required.",
  },
  {
    q: "How is my data kept secure?",
    a: "All marketplace tokens are encrypted with AES-256-GCM before storage. Webhooks are verified with HMAC-SHA256 timing-safe comparison. Sessions use HTTP-only JWT cookies (no localStorage). Customer PII is encrypted and automatically cleaned after 365 days. We're SOC 2 certified and GDPR compliant.",
  },
  {
    q: "What marketplaces do you support?",
    a: "We currently support 9 marketplaces: Shopify, Amazon, eBay, Etsy, Flipkart, BigCommerce, Square, Wix, and WooCommerce. We're actively adding more — PrestaShop and additional platforms are on our roadmap.",
  },
  {
    q: "How often does data sync?",
    a: "Shopify, BigCommerce, and Square push updates in real-time via webhooks. All other marketplaces sync every 15 minutes automatically. You can also trigger a manual sync anytime from the dashboard.",
  },
  {
    q: "What can I ask Frax?",
    a: "Anything about your business data. Revenue breakdowns, top products, customer segments, inventory levels, channel comparisons, period-over-period trends, stockout risks, channel-product fit analysis — Frax has 11 specialized analytics tools and understands natural language. Just type your question like you'd ask a human analyst.",
  },
  {
    q: "What makes the Channel-Product Fit feature different?",
    a: "It's a proprietary engine that scores every product's performance on each marketplace using 7 signals (revenue velocity, unit velocity, price position, sales trend, trend consistency, inventory turnover, return rate). It then generates specific recommendations: EXPAND to new channels, RESTOCK low inventory, REPRICE misaligned products, or DEPRIORITIZE underperformers. No other platform offers this.",
  },
  {
    q: "Can I use Frame if I only sell on one marketplace?",
    a: "Yes, but Frame's true power shines with 2+ marketplaces. With a single channel, you still get AI-powered analytics, automated reports, inventory alerts, and Frax as your analyst. Cross-channel comparison and channel-product fit become available as soon as you connect a second marketplace.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data remains intact for 30 days after cancellation, in case you change your mind. After 30 days, marketplace tokens are revoked and your data is permanently deleted in accordance with our GDPR-compliant data handling policy.",
  },
];

function FAQItem({ faq, index, isOpen, onToggle }: { faq: typeof faqs[number]; index: number; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`group rounded-xl border transition-all duration-200 ${isOpen ? 'border-teal-200 bg-teal-50/40 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 py-4 px-5 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors duration-200 ${isOpen ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`flex-1 text-sm font-semibold transition-colors duration-200 ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>
          {faq.q}
        </span>
        <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all duration-200 ${isOpen ? 'bg-teal-500 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-4 pl-16 text-sm text-slate-600 leading-relaxed">
          {faq.a}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-12 md:py-20 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Two-column: heading left, accordion right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-16 items-start">
          {/* Left column — heading + support prompt */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:sticky lg:top-32">
            <p className="fade-up text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              FAQ
            </p>
            <h2 className="fade-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Frequently Asked{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Questions</span>
            </h2>
            <p className="fade-up mt-6 text-lg text-slate-600 max-w-md">
              Everything you need to know about Frame. Can&apos;t find what you&apos;re looking for? Reach out to our team.
            </p>

            {/* Contact card */}
            <div className="fade-up mt-8 w-full max-w-sm rounded-xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Still have questions?</p>
                  <p className="text-xs text-slate-500">We&apos;re here to help.</p>
                </div>
              </div>
              <a
                href="/contact"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                Contact Support
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right column — accordion */}
          <div className="fade-up space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
