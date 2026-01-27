"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RequestTrialModal } from "./RequestTrialModal";

export function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            Connect Shopify, Amazon, eBay, Etsy, WooCommerce and more.
            Get unified insights across all your sales channels in seconds.
          </p>

          {/* CTA buttons */}
          <div className="fade-up mt-10 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 text-sm font-medium text-white hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-teal-500/25"
            >
              Request a Free Trial
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

      {/* Request Trial Modal */}
      <RequestTrialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}

function MarketplaceLogos() {
  const marketplaces = [
    {
      name: "Shopify",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 109 124" fill="none">
          <path d="M95.602 23.457c-.103-.704-.692-1.074-1.18-1.108-.487-.034-10.312-.792-10.312-.792s-6.84-6.636-7.576-7.372c-.736-.736-2.175-.513-2.733-.342-.017 0-1.469.452-3.938 1.214-2.35-6.784-6.5-13.015-13.783-13.015-.204 0-.412.013-.624.026C53.81.171 51.796 0 50.08 0 33.91 0 26.16 20.19 23.552 30.458c-7.73 2.392-13.228 4.095-13.929 4.32-4.342 1.367-4.48 1.504-5.046 5.606C4.1 43.782 0 100.14 0 100.14l75.84 13.09 38.16-9.52s-18.206-79.55-18.398-80.253z" fill="#95BF47"/>
          <path d="M55.42 40.129l-4.85 14.422s-4.255-2.268-9.44-2.268c-7.626 0-8.003 4.782-8.003 5.988 0 6.574 17.138 9.094 17.138 24.508 0 12.123-7.695 19.926-18.075 19.926-12.464 0-18.835-7.762-18.835-7.762l3.34-11.012s6.556 5.633 12.086 5.633c3.622 0 5.09-2.853 5.09-4.937 0-8.62-14.065-9.003-14.065-23.078 0-11.874 8.51-23.364 25.694-23.364 6.623 0 9.92 1.944 9.92 1.944z" fill="#fff"/>
        </svg>
      ),
    },
    {
      name: "Amazon",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path d="M29.62 29.284c-5.296 3.908-12.972 5.988-19.584 5.988-9.264 0-17.604-3.424-23.916-9.124-.496-.448-.052-1.06.544-.712 6.816 3.964 15.24 6.348 23.94 6.348 5.868 0 12.324-1.216 18.264-3.736.896-.38 1.648.592.752 1.236z" transform="translate(10 8)" fill="#FF9900"/>
          <path d="M31.768 26.816c-.676-.864-4.48-.408-6.188-.204-.52.06-.6-.392-.132-.72 3.028-2.132 8-1.516 8.584-.8.584.716-.152 5.684-2.996 8.052-.436.364-.852.172-.66-.312.64-1.6 2.072-5.152 1.392-6.016z" transform="translate(10 8)" fill="#FF9900"/>
        </svg>
      ),
    },
    {
      name: "eBay",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path fill="#E53238" d="M5.256 18.24c0-4.776 2.76-7.2 7.224-7.2 5.568 0 7.128 3.744 7.128 7.536v1.368H8.136c.072 2.904 1.944 4.536 4.92 4.536 2.568 0 4.248-.888 5.04-1.488l1.08 2.808c-1.2.912-3.336 1.8-6.264 1.8-5.304 0-7.656-3.12-7.656-7.56z"/>
          <path fill="#0064D2" d="M20.76 27.24V6.768h3.12V13.2c1.032-1.2 2.76-2.16 5.16-2.16 4.008 0 7.08 2.88 7.08 8.424 0 5.76-3.216 8.136-7.248 8.136-2.28 0-3.864-.84-5.016-2.088v1.728H20.76z"/>
          <path fill="#F5AF02" d="M36.888 20.4c0-4.8 2.664-9.36 8.136-9.36 2.712 0 4.56 1.104 5.616 2.28v-2.016h3.12v16.8c0 5.664-3.024 8.616-8.304 8.616-3.168 0-5.64-.984-7.248-2.232l1.344-2.64c1.392 1.056 3.384 1.92 5.832 1.92 3.528 0 5.256-1.896 5.256-5.424v-1.44c-1.032 1.2-2.928 2.328-5.616 2.328-5.4 0-8.136-4.056-8.136-8.832z"/>
          <path fill="#86B817" d="M28.128 18.336c-2.328 0-4.248 1.512-4.248 5.04 0 3.6 1.92 5.136 4.248 5.136 2.352 0 4.2-1.44 4.2-5.112 0-3.72-1.848-5.064-4.2-5.064z"/>
        </svg>
      ),
    },
    {
      name: "Etsy",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path d="M24 48c13.255 0 24-10.745 24-24S37.255 0 24 0 0 10.745 0 24s10.745 24 24 24z" fill="#F56400"/>
          <path d="M13.2 14.4c0-.48.24-.72.84-.72h9.72c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-6.72v5.4h5.76c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-5.76v5.88h6.96c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-9.96c-.6 0-.84-.24-.84-.72V14.4z" fill="#fff"/>
        </svg>
      ),
    },
    {
      name: "WooCommerce",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path d="M4.8 6h38.4c2.64 0 4.8 2.16 4.8 4.8v22.8c0 2.64-2.16 4.8-4.8 4.8H28.8l4.8 9.6-14.4-9.6H4.8c-2.64 0-4.8-2.16-4.8-4.8V10.8C0 8.16 2.16 6 4.8 6z" fill="#96588A"/>
          <path d="M5.52 11.04c.36-.48.84-.72 1.44-.72.84 0 1.44.36 1.8 1.08l3.24 7.32 3.24-7.32c.36-.72.96-1.08 1.8-1.08.6 0 1.08.24 1.44.72.36.48.48 1.08.36 1.8l-1.56 10.08c-.12.6-.36 1.08-.72 1.44-.36.36-.84.6-1.32.6-.6 0-1.08-.24-1.44-.72-.36-.48-.48-1.08-.36-1.8l.72-5.4-2.52 5.76c-.36.72-.84 1.08-1.44 1.08-.6 0-1.08-.36-1.44-1.08l-2.52-5.76.72 5.4c.12.72 0 1.32-.36 1.8-.36.48-.84.72-1.44.72-.48 0-.96-.24-1.32-.6-.36-.36-.6-.84-.72-1.44L1.56 12.84c-.12-.72 0-1.32.36-1.8z" fill="#fff"/>
          <path d="M21.72 14.04c1.56 0 2.76 1.44 2.76 4.08 0 2.64-1.2 4.08-2.76 4.08-1.56 0-2.76-1.44-2.76-4.08 0-2.64 1.2-4.08 2.76-4.08zm0 10.68c4.08 0 6.48-2.76 6.48-6.6 0-3.84-2.4-6.6-6.48-6.6-4.08 0-6.48 2.76-6.48 6.6 0 3.84 2.4 6.6 6.48 6.6z" fill="#fff"/>
        </svg>
      ),
    },
    {
      name: "BigCommerce",
      logo: (
        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
          <path d="M0 24C0 10.745 10.745 0 24 0s24 10.745 24 24-10.745 24-24 24S0 37.255 0 24z" fill="#121118"/>
          <path d="M11.4 15.6h8.4c2.76 0 4.68 1.08 4.68 3.36 0 1.56-.96 2.64-2.4 3.12v.12c1.92.36 3.12 1.56 3.12 3.48 0 2.52-2.04 3.72-5.04 3.72H11.4V15.6zm7.56 5.64c1.32 0 2.04-.6 2.04-1.56s-.72-1.44-2.04-1.44H14.4v3h4.56zm.48 6c1.44 0 2.28-.6 2.28-1.68s-.84-1.56-2.28-1.56H14.4v3.24h5.04z" fill="#fff"/>
          <path d="M35.28 26.76c-.36 1.8-1.56 3-3.6 3-2.4 0-3.96-1.68-3.96-4.44 0-2.76 1.56-4.44 3.96-4.44 2.04 0 3.24 1.2 3.6 3h3.12c-.48-3.48-3-5.88-6.72-5.88-4.32 0-7.2 3-7.2 7.32s2.88 7.32 7.2 7.32c3.72 0 6.24-2.4 6.72-5.88h-3.12z" fill="#fff"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="fade-up mt-20">
      <p className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider mb-8">
        Connect your favorite marketplaces
      </p>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {marketplaces.map((mp, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity cursor-default"
          >
            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
              {mp.logo}
            </div>
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{mp.name}</span>
          </div>
        ))}
        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 text-sm font-medium text-teal-700">
          +4 more
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
