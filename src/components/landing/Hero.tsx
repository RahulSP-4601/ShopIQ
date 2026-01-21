"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Minimal background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-white" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Trust badge */}
          <div className="fade-up mb-8 inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 shadow-sm">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-white"
                >
                  {i}K
                </div>
              ))}
            </div>
            <span className="text-sm text-emerald-800">
              Trusted by <span className="font-semibold text-emerald-900">10,000+</span> sellers worldwide
            </span>
          </div>

          {/* Main headline */}
          <h1 className="fade-up max-w-4xl text-4xl font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            The Analyst for{" "}
            <span className="text-indigo-600">All Your</span>
            <br />
            Marketplaces
          </h1>

          {/* Subheadline */}
          <p className="fade-up mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Connect Shopify, Amazon, eBay, Flipkart, Meesho and 50+ marketplaces.
            Get AI-powered insights across all your sales channels in one place.
          </p>

          {/* CTA buttons */}
          <div className="fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/connect"
              className="group flex h-12 items-center justify-center rounded-lg btn-primary px-6 text-sm font-medium text-white"
            >
              <span className="flex items-center gap-2">
                Start Free Trial
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </Link>
            <a
              href="#demo"
              className="group flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
            >
              <svg
                className="h-4 w-4 text-slate-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Watch Demo
            </a>
          </div>

          {/* Trust indicators */}
          <div className="fade-up mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Setup in 2 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
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
  return (
    <div className="fade-up mt-16 relative">
      <p className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider mb-8">
        Connect your marketplaces
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {/* Shopify - Green #95BF47 */}
        <div className="flex items-center gap-2 group">
          <svg className="w-7 h-7" viewBox="0 0 109 124" fill="#95BF47">
            <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5-.1-10.3-.8-10.3-.8s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.6-11.8h-.6c-1.9-2.5-4.2-3.6-6.2-3.6-15.3 0-22.6 19.1-24.9 28.8-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-9 69.3-9 69.3l67.5 12.7 36.5-7.9S95.9 24 95.8 23.4z"/>
          </svg>
          <span className="text-sm font-medium text-[#95BF47]">Shopify</span>
        </div>

        {/* Amazon - Orange #FF9900 */}
        <div className="flex items-center gap-2 group">
          <svg className="w-7 h-7" viewBox="0 0 48 48" fill="#FF9900">
            <path d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2zm3.5 14.1c0 1.2-.5 2.3-1.4 3.2-.9.9-2.1 1.4-3.4 1.4-1 0-1.8-.3-2.3-.8-.5-.5-.8-1.2-.8-2.1 0-1 .4-1.9 1.1-2.5.8-.6 1.9-.9 3.4-.9 1.2 0 2.4.2 3.4.4v1.3zM44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
          </svg>
          <span className="text-sm font-medium text-[#FF9900]">Amazon</span>
        </div>

        {/* eBay - Multicolor, using blue #0064D2 */}
        <div className="flex items-center gap-2 group">
          <svg className="w-7 h-7" viewBox="0 0 48 48">
            <path fill="#E53238" d="M8.2 22.8c0-2.9 1.7-5.2 5.1-5.2 3 0 4.7 1.8 4.7 4.8v.7H8.2v-.3z"/>
            <path fill="#0064D2" d="M20.8 25.9v-2.8c0-4.6-2.3-8.3-7.5-8.3-5 0-8 3.5-8 8.6 0 5.4 3.2 8.4 8.3 8.4 3.2 0 5.4-.9 6.7-2.1l-1.7-2.8c-1 .8-2.4 1.4-4.5 1.4-2.5 0-4.3-1.1-4.8-3.6h11.5v.2z"/>
            <path fill="#F5AF02" d="M22.1 31.4V10.3h3.4v8.1c1-2.1 3.2-3.6 6-3.6 4.5 0 7.3 3.5 7.3 8.4 0 5.1-3 8.6-7.5 8.6-2.7 0-4.8-1.4-5.9-3.5v3h-3.3z"/>
            <path fill="#86B817" d="M30.4 28.9c2.6 0 4.5-2.1 4.5-5.6 0-3.4-1.8-5.5-4.4-5.5-2.6 0-4.5 2.2-4.5 5.5 0 3.5 1.9 5.6 4.4 5.6z"/>
          </svg>
          <span className="text-sm font-medium">
            <span className="text-[#E53238]">e</span>
            <span className="text-[#0064D2]">B</span>
            <span className="text-[#F5AF02]">a</span>
            <span className="text-[#86B817]">y</span>
          </span>
        </div>

        {/* Etsy - Orange #F1641E */}
        <div className="flex items-center gap-2 group">
          <svg className="w-7 h-7" viewBox="0 0 48 48" fill="#F1641E">
            <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm8.6 29.2c-.8.3-2.3.7-4.2.7-5.7 0-8.8-3.1-8.8-8.7V15.8h-3.4v-3.1h3.4V8.1l4.2-1.1v5.7h6.1l-.8 3.1h-5.3v8.6c0 3.8 1.5 5.7 4.8 5.7 1.3 0 2.7-.3 3.8-.7l.2 3.8z"/>
          </svg>
          <span className="text-sm font-medium text-[#F1641E]">Etsy</span>
        </div>

        {/* Flipkart - Yellow #F8E71C with Blue #2874F0 */}
        <div className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded bg-[#2874F0] flex items-center justify-center">
            <span className="text-[#F8E71C] text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-medium text-[#2874F0]">Flipkart</span>
        </div>

        {/* Meesho - Pink/Magenta #F43397 */}
        <div className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded bg-[#F43397] flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-medium text-[#F43397]">Meesho</span>
        </div>

        {/* More */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
          <span className="text-sm font-medium">+50 more</span>
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
        Your combined revenue across all channels was{" "}
        <span className="font-semibold text-slate-900">$47,382</span>. Breakdown:
        Amazon $22,450 (47%), Shopify $14,280 (30%), Flipkart $7,890 (17%), Meesho $2,762 (6%).
        You&apos;re up <span className="font-semibold text-emerald-600">18%</span> from last week.
      </>
    ),
  },
  {
    question: "Which products are best sellers on Amazon vs Flipkart?",
    answer: (
      <>
        Your <span className="font-semibold text-slate-900">Electronics</span> sell 3x better on Amazon,
        while <span className="font-semibold text-slate-900">Fashion items</span> outperform 2.5x on Flipkart.
        Consider increasing Fashion inventory allocation to Flipkart by 40%.
      </>
    ),
  },
  {
    question: "How can I optimize my inventory across channels?",
    answer: (
      <>
        Move <span className="font-semibold text-slate-900">200 units of Summer Collection</span> from Shopify to Amazon (selling 3x faster there).
        Your Meesho inventory for Kids Wear is low — restocking could capture{" "}
        <span className="font-semibold text-emerald-600">$8,400</span> in potential sales.
      </>
    ),
  },
  {
    question: "Show me my customer acquisition costs by marketplace",
    answer: (
      <>
        CAC Analysis: Meesho <span className="font-semibold text-emerald-600">$2.40</span> (lowest),
        Flipkart $4.80, Amazon $6.20, Shopify $8.90 (highest).
        Meesho offers the best ROI for new customer acquisition in Tier 2/3 cities.
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setIsAnimating(true);
      setShowAnswer(false);

      const t1 = setTimeout(() => {
        setShowQuestion(false);
      }, 200);
      timeoutsRef.current.push(t1);

      const t2 = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % chatConversations.length);
        setIsAnimating(false);
        setShowQuestion(true);
      }, 600);
      timeoutsRef.current.push(t2);

      const t3 = setTimeout(() => {
        setShowAnswer(true);
      }, 1300);
      timeoutsRef.current.push(t3);
    }, 6000);
  };

  const navigateToIndex = (index: number) => {
    if (isAnimating || index === currentIndex) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
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

    return () => {
      clearAllTimeouts();
    };
  }, []);

  useEffect(() => {
    startAutoRotation();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearAllTimeouts();
    };
  }, []);

  const current = chatConversations[currentIndex];

  return (
    <div id="demo" className="fade-up relative mt-20">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Browser chrome */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-slate-200" />
              <div className="h-3 w-3 rounded-full bg-slate-200" />
              <div className="h-3 w-3 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 h-7 rounded-md bg-white border border-slate-200 px-3 w-64">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs text-slate-500">app.shopiq.ai</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white min-h-[280px]">
          {/* User Question */}
          <div
            className={`mb-5 flex items-start gap-3 transition-all duration-400 ease-out ${
              showQuestion
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 max-w-[80%]">
              <p className="text-sm text-slate-700">{current.question}</p>
            </div>
          </div>

          {/* AI Answer */}
          <div
            className={`flex items-start gap-3 transition-all duration-400 ease-out ${
              showAnswer
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-indigo-50 px-4 py-3 border border-indigo-100 max-w-[80%]">
              <p className="text-sm text-slate-700 leading-relaxed">{current.answer}</p>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-1.5 pb-4">
          {chatConversations.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToIndex(index)}
              className="p-2 -m-2 cursor-pointer"
              aria-label={`Go to conversation ${index + 1}`}
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-1 bg-slate-200 hover:bg-slate-300'
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
    { value: "$2B+", label: "Revenue Analyzed", color: "text-emerald-600" },
    { value: "50K+", label: "Active Sellers", color: "text-indigo-600" },
    { value: "50+", label: "Marketplaces", color: "text-cyan-600" },
    { value: "99.9%", label: "Uptime SLA", color: "text-amber-600" },
  ];

  return (
    <div className="fade-up mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-100 bg-white p-5 text-center hover:shadow-md transition-shadow"
        >
          <div className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
