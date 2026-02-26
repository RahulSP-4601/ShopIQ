"use client";

import { useState } from "react";
import { RequestTrialModal } from "./RequestTrialModal";

const steps = [
  {
    number: "01",
    title: "Connect in One Click",
    description: "Choose any of 9 supported marketplaces, click Connect, authorize via OAuth, and you're done. Frame securely stores your encrypted tokens and begins syncing immediately. Read-only access — we never modify your store.",
    features: ["Secure OAuth 2.0", "Read-Only Access", "AES-256 Encryption", "Instant Sync"],
    time: "~30 seconds per marketplace",
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-500",
  },
  {
    number: "02",
    title: "Ask Questions, Get Answers",
    description: "Type any question about your business in plain English. Frax analyzes your unified data across all connected channels and returns specific, actionable insights with real numbers — not vague summaries.",
    features: ["Natural Language AI", "11 Analytics Tools", "Cross-Channel Analysis", "Working Memory"],
    time: "Answers in ~3 seconds",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500",
  },
  {
    number: "03",
    title: "Get Smarter Every Day",
    description: "Automated briefings arrive in your inbox daily. Proactive alerts catch stockouts and surges before they cost you revenue. The Channel-Product Fit engine continuously finds new opportunities.",
    features: ["Daily Briefings", "Proactive Alerts", "Channel-Product Fit", "AI That Learns"],
    time: "Fully automated — zero effort",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500",
  },
];

export function HowItWorks() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="how-it-works" className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center fade-up max-w-2xl mx-auto">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
            Up and Running in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Under 2 Minutes</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No technical setup. No API keys. No spreadsheets. Connect your first marketplace and start asking questions immediately.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-20 relative">
          {/* Connection line - desktop only */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-violet-200 to-orange-200" />

          <div className="grid gap-6 md:gap-12 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="fade-up relative"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Step number */}
                <div className="flex items-center justify-center lg:justify-start mb-8">
                  <div className="relative">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${step.bgColor} text-white font-bold text-lg shadow-lg`}>
                      {step.number}
                    </div>
                    <div className={`absolute inset-0 rounded-full ${step.bgColor} opacity-20 blur-xl`} />
                  </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group">
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Time estimate */}
                  <p className="text-xs font-medium text-teal-600 mb-4">{step.time}</p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap gap-2">
                    {step.features.map((feature, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${step.color} text-white`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="fade-up mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["bg-teal-500", "bg-violet-500", "bg-orange-500", "bg-blue-500", "bg-pink-500"].map((color, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-[10px] font-medium text-white`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-medium text-slate-600">
                  +2.8K
                </div>
              </div>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">2,847 sellers</span> started this week
              </span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-500/25"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </div>

      <RequestTrialModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
