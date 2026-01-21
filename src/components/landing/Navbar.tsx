"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src="/logo.png"
              alt="ShopIQ Logo"
              className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ShopIQ
            </span>
            <span className="text-[10px] text-indigo-500 font-medium tracking-wider uppercase">
              Multi-Channel Analytics
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center gap-1">
          <a
            href="#integrations"
            className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all duration-200 hover:text-slate-900 hover:bg-slate-50"
          >
            Integrations
          </a>
          <a
            href="#features"
            className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all duration-200 hover:text-slate-900 hover:bg-slate-50"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all duration-200 hover:text-slate-900 hover:bg-slate-50"
          >
            How it Works
          </a>
          <a
            href="#pricing"
            className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg transition-all duration-200 hover:text-slate-900 hover:bg-slate-50"
          >
            Pricing
          </a>
        </div>

        {/* Trust Badge + CTA */}
        <div className="flex items-center gap-4">
          {/* Trust indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-emerald-700">SOC 2 Compliant</span>
          </div>

          <Link
            href="/chat"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            Sign In
          </Link>

          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white btn-primary rounded-lg"
          >
            Start Free Trial
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
