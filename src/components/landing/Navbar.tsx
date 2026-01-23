"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="ShopIQ"
            width={36}
            height={36}
            className="transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              ShopIQ
            </span>
            <span className="text-[10px] text-teal-600 font-semibold tracking-wide uppercase -mt-0.5">
              Analytics
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { href: "#integrations", label: "Integrations" },
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it Works" },
            { href: "#pricing", label: "Pricing" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg transition-colors hover:text-slate-900 hover:bg-slate-100/50"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Trust Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100">
            <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-teal-700">SOC 2</span>
          </div>

          <Link
            href="/chat"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>

          <Link
            href="/connect"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-teal-500/25"
          >
            Get Started
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
