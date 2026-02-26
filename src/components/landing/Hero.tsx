"use client";

import { useState, useEffect, useRef } from "react";
import { RequestTrialModal } from "./RequestTrialModal";

export function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative pt-16 md:pt-24 lg:pt-28 pb-12 md:pb-16 lg:pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-50/50 via-white to-white" />

      {/* Colored gradient orbs */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-teal-200/30 to-emerald-200/20 rounded-full blur-3xl" />
      <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/20 to-indigo-200/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-t from-emerald-200/10 to-teal-200/5 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Two-column grid: text left, demo right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column — text content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Eyebrow badge */}
            <div className="fade-up inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 mb-6">
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              <span>Powered by AI</span>
              <span className="text-teal-300">·</span>
              <span>Trusted by 10,000+ sellers</span>
            </div>

            {/* Main headline */}
            <h1 className="fade-up text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Stop Guessing.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600">Start Knowing.</span>
            </h1>

            {/* Subheadline */}
            <p className="fade-up mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
              Frame connects <span className="font-semibold text-slate-700">Shopify</span>, <span className="font-semibold text-slate-700">Amazon</span>, <span className="font-semibold text-slate-700">eBay</span>, <span className="font-semibold text-slate-700">Etsy</span>, <span className="font-semibold text-slate-700">Flipkart</span> and 4 more marketplaces
              into one AI-powered command center. Ask questions in plain English — get
              instant, data-backed answers across all your sales channels.
            </p>

            {/* CTA buttons */}
            <div className="fade-up mt-10 flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 text-sm font-semibold text-white hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02]"
              >
                Start Free Trial
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <a
                href="#demo"
                className="group flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                See It In Action
              </a>
            </div>

            {/* Trust points */}
            <div className="fade-up mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-slate-500">
              {["No credit card required", "2-minute setup", "30-day free trial", "Cancel anytime"].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — interactive demo */}
          <div className="fade-up" id="demo">
            <HeroDemo />
          </div>
        </div>
      </div>

      {/* Request Trial Modal */}
      <RequestTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}

const chatConversations = [
  {
    label: "Revenue",
    question: "What was my total revenue across all channels last week?",
    answer: (
      <div>
        <p className="mb-2">Last week across all 4 marketplaces:</p>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Amazon</span><span className="text-teal-400">$22,450 <span className="text-emerald-400">+24%</span></span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Shopify</span><span className="text-teal-400">$14,280 <span className="text-emerald-400">+12%</span></span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Flipkart</span><span className="text-teal-400">$7,890 <span className="text-emerald-400">+8%</span></span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>eBay</span><span className="text-teal-400">$2,762 <span className="text-red-400">-3%</span></span></div>
        </div>
        <p><span className="font-semibold text-white">Total: $47,382</span> — up <span className="font-semibold text-teal-400">18%</span> from last week. Amazon drove most of the growth.</p>
      </div>
    ),
  },
  {
    label: "Product Fit",
    question: "Where should I sell my wireless earbuds?",
    answer: (
      <div>
        <p className="mb-2">Channel-Product Fit analysis for <span className="font-semibold text-white">Wireless Earbuds Pro</span>:</p>
        <div className="space-y-1 text-xs mb-2">
          <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1"><span className="w-16">Amazon</span><div className="flex-1 bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 rounded-full h-2" style={{width:'92%'}} /></div><span className="text-emerald-400 font-mono">92</span></div>
          <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1"><span className="w-16">Shopify</span><div className="flex-1 bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 rounded-full h-2" style={{width:'85%'}} /></div><span className="text-emerald-400 font-mono">85</span></div>
          <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1"><span className="w-16">Flipkart</span><div className="flex-1 bg-slate-700 rounded-full h-2"><div className="bg-amber-500 rounded-full h-2" style={{width:'74%'}} /></div><span className="text-amber-400 font-mono">74</span></div>
        </div>
        <p><span className="font-semibold text-emerald-400">EXPAND to Amazon</span> — estimated uplift: <span className="font-semibold text-white">+$2,600/mo</span></p>
      </div>
    ),
  },
  {
    label: "Alerts",
    question: "Any alerts I should know about?",
    answer: (
      <div>
        <p className="mb-2">3 alerts flagged this morning:</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
            <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-red-500" />
            <div><span className="font-semibold text-red-400">STOCKOUT</span> — Summer Dress (Flipkart): <span className="text-white">3 units left</span>. Selling 8/day.</div>
          </div>
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1.5">
            <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-amber-500" />
            <div><span className="font-semibold text-amber-400">SURGE</span> — Earbuds (Amazon): Velocity jumped <span className="text-white">45 → 112 units</span>/week.</div>
          </div>
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1.5">
            <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-blue-500" />
            <div><span className="font-semibold text-blue-400">RETURNS</span> — Laptop Bag (eBay): Return rate hit <span className="text-white">12%</span> (was 4%).</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Customers",
    question: "Who are my top customers and what are they buying?",
    answer: (
      <div>
        <p className="mb-2">Top 5 customers by lifetime value:</p>
        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>1. Priya M.</span><span className="text-teal-400">$4,280 LTV · 23 orders</span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>2. James K.</span><span className="text-teal-400">$3,920 LTV · 18 orders</span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>3. Ankit S.</span><span className="text-teal-400">$3,100 LTV · 31 orders</span></div>
        </div>
        <p><span className="font-semibold text-white">68%</span> of top customers buy from multiple categories. Cross-selling could increase LTV by <span className="text-teal-400">15-20%</span>.</p>
      </div>
    ),
  },
  {
    label: "Briefing",
    question: "Give me my morning briefing",
    answer: (
      <div>
        <p className="mb-2 font-semibold text-white">Daily Briefing — Feb 25</p>
        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Revenue</span><span className="text-teal-400 font-semibold">$6,847 <span className="text-emerald-400">+11%</span></span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Orders</span><span className="text-white">94 across 4 channels</span></div>
          <div className="flex justify-between bg-white/5 rounded px-2 py-1"><span>Top Seller</span><span className="text-white">Earbuds Pro — 34 units</span></div>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400"><span>⚠</span><span>Summer Dress critically low (3 units)</span></div>
          <div className="flex items-center gap-1.5 text-emerald-400"><span>✓</span><span>Full briefing sent to your email at 7:00 AM</span></div>
        </div>
      </div>
    ),
  },
];

const sidebarMarketplaces = [
  { name: "Shopify", color: "#95BF47" },
  { name: "Amazon", color: "#FF9900" },
  { name: "Flipkart", color: "#2874F0" },
  { name: "eBay", color: "#E53238" },
];

function HeroDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const startAutoRotation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setIsAnimating(true);
      setShowAnswer(false);

      const t1 = setTimeout(() => setShowQuestion(false), 200);
      timeoutsRef.current.push(t1);

      const t2 = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % chatConversations.length);
        setIsAnimating(false);
        setShowQuestion(true);
      }, 600);
      timeoutsRef.current.push(t2);

      const t3 = setTimeout(() => setShowAnswer(true), 1300);
      timeoutsRef.current.push(t3);
    }, 7000);
  };

  const navigateToIndex = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    clearAllTimeouts();

    setIsAnimating(true);
    setShowAnswer(false);

    const t1 = setTimeout(() => setShowQuestion(false), 200);
    const t2 = setTimeout(() => {
      setCurrentIndex(index);
      setIsAnimating(false);
      setShowQuestion(true);
    }, 600);
    const t3 = setTimeout(() => {
      setShowAnswer(true);
      startAutoRotation();
    }, 1300);
    timeoutsRef.current.push(t1, t2, t3);
  };

  useEffect(() => {
    const timer1 = setTimeout(() => setShowQuestion(true), 500);
    const timer2 = setTimeout(() => setShowAnswer(true), 1200);
    timeoutsRef.current.push(timer1, timer2);
    return () => clearAllTimeouts();
  }, []);

  useEffect(() => {
    startAutoRotation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearAllTimeouts();
    };
  }, []);

  const current = chatConversations[currentIndex];

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Browser chrome */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 h-6 rounded-md bg-white border border-slate-200 px-3 w-48">
                <svg className="w-2.5 h-2.5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] text-slate-500">app.frame.com/chat</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar - hidden on smaller screens */}
          <div className="hidden xl:flex flex-col w-48 border-r border-slate-100 bg-slate-50/50 p-3">
            {/* User */}
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-semibold">R</div>
              <div>
                <div className="text-[11px] font-semibold text-slate-800">Rahul&apos;s Store</div>
                <div className="text-[9px] text-slate-400">Pro Plan</div>
              </div>
            </div>

            {/* Connected marketplaces */}
            <div className="mb-3">
              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Connected</div>
              {sidebarMarketplaces.map((mp) => (
                <div key={mp.name} className="flex items-center gap-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mp.color }} />
                  <span className="text-[11px] text-slate-600">{mp.name}</span>
                  <span className="ml-auto w-1 h-1 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-0.5">
              <div className="text-[9px] text-slate-400">4 stores · 1,247 products</div>
              <div className="text-[9px] text-emerald-600">Synced 2 min ago</div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 p-4 sm:p-5 min-h-[260px]">
            {/* User Question */}
            <div
              className={`mb-4 flex items-start gap-2.5 transition-all duration-300 ease-out ${
                showQuestion ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2 max-w-[85%]">
                <p className="text-xs text-slate-700">{current.question}</p>
              </div>
            </div>

            {/* AI Answer */}
            <div
              className={`flex items-start gap-2.5 transition-all duration-300 ease-out ${
                showAnswer ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-gradient-to-br from-slate-800 to-slate-900 px-3 py-2.5 max-w-[85%]">
                <div className="text-xs text-slate-200 leading-relaxed">{current.answer}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress indicators + labels */}
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex justify-center gap-1.5 mb-1.5">
            {chatConversations.map((_, index) => (
              <button
                key={index}
                onClick={() => navigateToIndex(index)}
                className="p-1.5 -m-1.5 cursor-pointer"
                aria-label={`Go to conversation ${index + 1}`}
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "w-5 bg-gradient-to-r from-teal-500 to-emerald-500" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            {chatConversations.map((conv, index) => (
              <button
                key={index}
                onClick={() => navigateToIndex(index)}
                className={`text-[10px] font-medium transition-colors cursor-pointer ${
                  index === currentIndex ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {conv.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
