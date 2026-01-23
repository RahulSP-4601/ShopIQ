"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-50/50 via-white to-white" />

      {/* Colored gradient orbs */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-teal-200/30 to-emerald-200/20 rounded-full blur-3xl" />
      <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/20 to-indigo-200/10 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Announcement badge */}
          <div className="fade-up mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <span className="text-sm text-slate-600">
                Trusted by <span className="font-semibold text-teal-700">10,000+</span> sellers worldwide
              </span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="fade-up text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            The AI Analyst for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600">All Your Marketplaces</span>
          </h1>

          {/* Subheadline */}
          <p className="fade-up mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
            Connect Shopify, Amazon, Flipkart, Meesho and 10+ marketplaces.
            Get unified insights across all your sales channels in seconds.
          </p>

          {/* CTA buttons */}
          <div className="fade-up mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/connect"
              className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 text-sm font-medium text-white hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-teal-500/25"
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
            </Link>
            <a
              href="#demo"
              className="group flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Trust points */}
          <div className="fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            {["No credit card required", "2-minute setup", "Cancel anytime"].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace logos */}
        <MarketplaceLogos />

        {/* Interactive Demo */}
        <HeroDemo />

        {/* Stats */}
        <Stats />
      </div>
    </section>
  );
}

function MarketplaceLogos() {
  const marketplaces = [
    { name: "Shopify", color: "#95BF47" },
    { name: "Amazon", color: "#FF9900" },
    { name: "eBay", color: "#0064D2" },
    { name: "Flipkart", color: "#2874F0" },
    { name: "Meesho", color: "#F43397" },
    { name: "Myntra", color: "#FF3F6C" },
  ];

  return (
    <div className="fade-up mt-20">
      <p className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider mb-8">
        Connect your favorite marketplaces
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {marketplaces.map((mp, i) => (
          <div
            key={i}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-default"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: mp.color }}
            >
              {mp.name.charAt(0)}
            </div>
            <span className="text-sm font-medium text-slate-700">{mp.name}</span>
          </div>
        ))}
        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 text-sm font-medium text-teal-700">
          +10 more
        </div>
      </div>
    </div>
  );
}

const chatConversations = [
  {
    question: "What was my total revenue across all marketplaces last week?",
    answer: (
      <>
        Your combined revenue was <span className="font-semibold text-white">$47,382</span>.
        Amazon $22,450 (47%), Shopify $14,280 (30%), Flipkart $7,890 (17%), Meesho $2,762 (6%).
        You&apos;re up <span className="font-semibold text-teal-400">18%</span> from last week.
      </>
    ),
  },
  {
    question: "Which products are best sellers on Amazon vs Flipkart?",
    answer: (
      <>
        <span className="font-semibold text-white">Electronics</span> sell 3x better on Amazon,
        while <span className="font-semibold text-white">Fashion items</span> outperform 2.5x on Flipkart.
        Consider increasing Fashion inventory allocation to Flipkart.
      </>
    ),
  },
  {
    question: "How can I optimize my inventory across channels?",
    answer: (
      <>
        Move <span className="font-semibold text-white">200 units of Summer Collection</span> from Shopify to Amazon.
        Your Meesho inventory for Kids Wear is low — restocking could capture{" "}
        <span className="font-semibold text-teal-400">$8,400</span> in potential sales.
      </>
    ),
  },
  {
    question: "Show me my customer acquisition costs by marketplace",
    answer: (
      <>
        CAC Analysis: Meesho <span className="font-semibold text-teal-400">$2.40</span> (lowest),
        Flipkart $4.80, Amazon $6.20, Shopify $8.90 (highest).
        Meesho offers the best ROI for new customers.
      </>
    ),
  },
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
    }, 6000);
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
    <div id="demo" className="fade-up relative mt-20 max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Browser chrome */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 h-7 rounded-lg bg-white border border-slate-200 px-3 w-64">
                <svg className="w-3 h-3 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-slate-500">app.shopiq.ai</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 min-h-[260px]">
          {/* User Question */}
          <div
            className={`mb-5 flex items-start gap-3 transition-all duration-300 ease-out ${
              showQuestion ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
              <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 max-w-[85%]">
              <p className="text-sm text-slate-700">{current.question}</p>
            </div>
          </div>

          {/* AI Answer */}
          <div
            className={`flex items-start gap-3 transition-all duration-300 ease-out ${
              showAnswer ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-md bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-3 max-w-[85%]">
              <p className="text-sm text-slate-200 leading-relaxed">{current.answer}</p>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-1.5 pb-5">
          {chatConversations.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToIndex(index)}
              className="p-2 -m-2 cursor-pointer"
              aria-label={`Go to conversation ${index + 1}`}
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-6 bg-gradient-to-r from-teal-500 to-emerald-500" : "w-1.5 bg-slate-200 hover:bg-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { value: "$2B+", label: "Revenue Analyzed", color: "from-teal-500 to-emerald-500" },
    { value: "50K+", label: "Active Sellers", color: "from-blue-500 to-indigo-500" },
    { value: "10+", label: "Marketplaces", color: "from-violet-500 to-purple-500" },
    { value: "99.9%", label: "Uptime SLA", color: "from-orange-500 to-amber-500" },
  ];

  return (
    <div className="fade-up mt-20 grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group rounded-2xl border border-slate-100 bg-white p-6 text-center hover:border-slate-200 hover:shadow-lg transition-all duration-300"
        >
          <div className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>{stat.value}</div>
          <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
