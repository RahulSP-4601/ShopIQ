"use client";

import Link from "next/link";
import Image from "next/image";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { name: "Features", href: "#features" },
      { name: "Integrations", href: "#integrations" },
      { name: "Pricing", href: "#pricing" },
      { name: "Changelog", href: "/changelog" },
      { name: "API Docs", href: "/docs" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" },
      { name: "Contact", href: "/contact" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Community", href: "/community" },
      { name: "Guides", href: "/guides" },
      { name: "Case Studies", href: "/case-studies" },
      { name: "Status", href: "/status" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "Security", href: "/security" },
      { name: "GDPR", href: "/gdpr" },
    ],
  },
};

const socialLinks = [
  {
    name: "Twitter",
    href: "https://twitter.com/frameanalytics",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/frameanalytics",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/frameanalytics",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
];

export function Footer() {
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-10 sm:py-16 grid grid-cols-1 sm:grid-cols-2 gap-8 lg:grid-cols-6">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo.png"
                alt="Frame"
                width={82}
                height={82}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900 tracking-tight">
                  Frame
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase -mt-0.5">
                  Analytics
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-slate-600 max-w-xs leading-relaxed">
              The AI-powered analytics platform for multi-channel e-commerce
              sellers. Connect all your marketplaces and get unified insights.
            </p>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-500 transition-all duration-200 hover:text-slate-900 hover:border-slate-200 hover:bg-white"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-900"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Frame. All rights reserved.
            </p>
            <button
              onClick={openPreferences}
              className="text-sm text-slate-400 transition-colors hover:text-slate-600"
            >
              Cookie Settings
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <svg
                className="w-3.5 h-3.5 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              SOC 2 Certified
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <svg
                className="w-3.5 h-3.5 text-emerald-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              GDPR Compliant
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
