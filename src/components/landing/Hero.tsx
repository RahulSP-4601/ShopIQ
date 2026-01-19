"use client";

import { useState, useEffect, useRef } from "react";

export function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-32 pb-20">
      <div className="flex flex-col items-center text-center">
        <div className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 text-sm text-emerald-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          AI-Powered Store Analytics
        </div>
        <h1 className="fade-up max-w-4xl text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
          Your AI E-commerce
          <span className="relative">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent animate-gradient">
              {" "}
              Analyst
            </span>
            <svg
              className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500/30"
              viewBox="0 0 200 12"
              fill="none"
            >
              <path
                d="M2 8.5C50 2.5 150 2.5 198 8.5"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="animate-draw"
              />
            </svg>
          </span>
        </h1>
        <p className="fade-up mt-8 max-w-2xl text-lg leading-relaxed text-slate-600">
          Stop digging through dashboards and spreadsheets. Connect your
          store and ask questions in plain English — get instant,
          accurate answers powered by AI.
        </p>
        <div className="fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="/chat"
            className="group relative overflow-hidden flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-8 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
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
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </a>
          <a
            href="#demo"
            className="group flex h-14 items-center justify-center gap-3 rounded-full border-2 border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition-transform duration-300 group-hover:scale-110">
              <svg
                className="h-4 w-4 ml-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            Watch Demo
          </a>
        </div>
        <p className="fade-up mt-6 flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Free to start. No credit card required.
        </p>
      </div>

      <HeroDemo />
      <Stats />
    </section>
  );
}

const chatConversations = [
  {
    question: "What was my revenue last week and how does it compare to the previous week?",
    answer: (
      <>
        Your revenue last week was{" "}
        <span className="font-bold text-emerald-600">$12,847</span>, which is{" "}
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          23% higher
        </span>{" "}
        than the previous week ($10,445). The increase was primarily driven by your
        &ldquo;Summer Collection&rdquo; products, which saw a 45% spike in orders.
      </>
    ),
  },
  {
    question: "Which products are my best sellers this month?",
    answer: (
      <>
        Your top 3 best sellers this month are:{" "}
        <span className="font-bold text-emerald-600">1. Classic White Tee</span> (342 units),{" "}
        <span className="font-bold text-emerald-600">2. Denim Jacket</span> (287 units), and{" "}
        <span className="font-bold text-emerald-600">3. Summer Dress</span> (256 units). Together they account for{" "}
        <span className="font-bold text-teal-600">38% of total sales</span>.
      </>
    ),
  },
  {
    question: "What's my customer retention rate and how can I improve it?",
    answer: (
      <>
        Your customer retention rate is{" "}
        <span className="font-bold text-emerald-600">24.3%</span>, which is{" "}
        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
          below average
        </span>{" "}
        for your industry (32%). I recommend implementing a{" "}
        <span className="font-bold text-teal-600">loyalty program</span> and{" "}
        <span className="font-bold text-teal-600">personalized email campaigns</span>.
      </>
    ),
  },
  {
    question: "Show me my sales by region for the last quarter",
    answer: (
      <>
        Here&apos;s your regional breakdown:{" "}
        <span className="font-bold text-emerald-600">California</span> leads with $45,230 (28%),
        followed by <span className="font-bold text-emerald-600">New York</span> at $38,450 (24%),
        and <span className="font-bold text-emerald-600">Texas</span> at $29,800 (18%).
        International sales grew by{" "}
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          47%
        </span>{" "}
        this quarter!
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
    }, 5000);
  };

  const navigateToIndex = (index: number) => {
    if (isAnimating || index === currentIndex) return;

    // Clear existing interval and timeouts, then restart
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
      // Restart auto-rotation after manual navigation completes
      startAutoRotation();
    }, 1300);
    timeoutsRef.current.push(t1, t2, t3);
  };

  useEffect(() => {
    // Initial animation
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
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl opacity-60 animate-pulse-slow" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400 shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-yellow-400 shadow-sm" />
            <div className="h-3 w-3 rounded-full bg-green-400 shadow-sm" />
            <div className="ml-4 flex-1 h-6 rounded-md bg-white border border-slate-200 flex items-center px-3">
              <span className="text-xs text-slate-400">shopiq.ai/chat</span>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-gradient-to-b from-white to-slate-50/50 min-h-[280px]">
          {/* User Question - slides from right */}
          <div
            className={`mb-6 flex items-start gap-4 transition-all duration-500 ease-out ${
              showQuestion
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-12'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 shadow-sm">
              <svg
                className="h-5 w-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-none bg-slate-100 px-5 py-3 shadow-sm max-w-[85%]">
              <p className="text-slate-700">{current.question}</p>
            </div>
          </div>

          {/* AI Answer - slides from left */}
          <div
            className={`flex items-start gap-4 transition-all duration-500 ease-out ${
              showAnswer
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-12'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div className="rounded-2xl rounded-tl-none bg-gradient-to-br from-emerald-50 to-teal-50 px-5 py-4 shadow-sm border border-emerald-100 max-w-[85%]">
              <p className="text-slate-700 leading-relaxed">{current.answer}</p>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center gap-2 pb-4">
          {chatConversations.map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToIndex(index)}
              className="p-3 -m-3 cursor-pointer"
              aria-label={`Go to conversation ${index + 1}`}
              aria-current={index === currentIndex ? "true" : undefined}
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
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
    { value: "10K+", label: "Questions Answered" },
    { value: "500+", label: "Stores Connected" },
    { value: "$2M+", label: "Revenue Analyzed" },
    { value: "24/7", label: "Always Available" },
  ];

  return (
    <div className="fade-up mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-lg shadow-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative">
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
