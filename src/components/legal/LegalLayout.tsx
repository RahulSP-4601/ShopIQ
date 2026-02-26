"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: Section[];
  children: React.ReactNode;
}

const legalPages = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/security", label: "Security" },
  { href: "/gdpr", label: "GDPR" },
];

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  sections,
  children,
}: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/logo.png"
                alt="Frame"
                width={36}
                height={36}
                className="object-contain sm:w-10 sm:h-10"
              />
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-slate-900">Frame</span>
                <span className="ml-2 text-xs font-medium text-slate-400">ANALYTICS</span>
              </div>
              <span className="sm:hidden text-base font-semibold text-slate-900">Frame</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors flex items-center gap-1 sm:gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Decorative elements - hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="hidden sm:block absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4" style={{ color: '#ffffff' }}>
              {title}
            </h1>
            <p className="text-base sm:text-lg mb-4 sm:mb-6" style={{ color: '#cbd5e1' }}>
              {subtitle}
            </p>
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm text-slate-300">Last updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-12">
          {/* Sidebar - Table of Contents (Desktop) */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">On this page</h2>
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? "bg-teal-50 text-teal-700 font-medium"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Other Legal Pages */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Legal Pages</h2>
                <ul className="space-y-2">
                  {legalPages.map((page) => (
                    <li key={page.href}>
                      <Link
                        href={page.href}
                        className="block text-sm py-1.5 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        {page.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            {/* Mobile Table of Contents */}
            <div className="lg:hidden mb-6 sm:mb-8">
              <details className="group rounded-xl sm:rounded-2xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-3 sm:p-4 text-sm font-semibold text-slate-900">
                  Table of Contents
                  <svg
                    className="w-5 h-5 text-slate-500 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="border-t border-slate-200 p-3 sm:p-4">
                  <ul className="space-y-1 sm:space-y-2 mb-4">
                    {sections.map((section) => (
                      <li key={section.id}>
                        <button
                          onClick={() => scrollToSection(section.id)}
                          className="block w-full text-left text-sm py-1.5 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          {section.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {/* Mobile Legal Pages Links */}
                  <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Other Legal Pages</h3>
                    <div className="flex flex-wrap gap-2">
                      {legalPages.map((page) => (
                        <Link
                          key={page.href}
                          href={page.href}
                          className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        >
                          {page.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* Page Content */}
            <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Legal Links - Wrap on mobile */}
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-slate-600">
              {legalPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="hover:text-teal-600 transition-colors"
                >
                  {page.label}
                </Link>
              ))}
            </div>
            {/* Copyright */}
            <p className="text-sm text-slate-500 text-center sm:text-left">
              &copy; {new Date().getFullYear()} Frame. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Reusable section component
interface LegalSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12">
      <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-xs sm:text-sm font-bold flex-shrink-0">
            {title.charAt(0)}
          </span>
          <span className="leading-tight">{title}</span>
        </h2>
        <div className="text-slate-600 leading-relaxed space-y-3 sm:space-y-4 text-sm sm:text-base">
          {children}
        </div>
      </div>
    </section>
  );
}

// Info card component
interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  variant?: "default" | "highlight" | "warning";
}

export function InfoCard({ title, children, variant = "default" }: InfoCardProps) {
  const variantStyles = {
    default: "bg-slate-50 border-slate-200",
    highlight: "bg-teal-50 border-teal-200",
    warning: "bg-amber-50 border-amber-200",
  };

  return (
    <div className={`rounded-lg sm:rounded-xl border p-3 sm:p-4 ${variantStyles[variant]}`}>
      <h3 className="font-semibold text-slate-900 mb-1.5 sm:mb-2 text-sm sm:text-base">{title}</h3>
      <div className="text-xs sm:text-sm text-slate-600">{children}</div>
    </div>
  );
}

// List component
interface LegalListProps {
  items: string[];
}

export function LegalList({ items }: LegalListProps) {
  return (
    <ul className="space-y-1.5 sm:space-y-2 mt-2 sm:mt-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 sm:gap-3">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm sm:text-base">{item}</span>
        </li>
      ))}
    </ul>
  );
}
