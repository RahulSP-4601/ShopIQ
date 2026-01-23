"use client";

import React, { useId, useEffect } from "react";
import Image from "next/image";

// Marketplace configurations with SVG logos
const marketplaces = [
  {
    name: "Shopify",
    color: "#95BF47",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 109 124" fill="#95BF47">
        <path d="M95.8 23.4c-.1-.6-.6-1-1.1-1-.5-.1-10.3-.8-10.3-.8s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.6-11.8h-.6c-1.9-2.5-4.2-3.6-6.2-3.6-15.3 0-22.6 19.1-24.9 28.8-5.9 1.8-10.1 3.1-10.6 3.3-3.3 1-3.4 1.1-3.8 4.2-.3 2.3-9 69.3-9 69.3l67.5 12.7 36.5-7.9S95.9 24 95.8 23.4z"/>
      </svg>
    ),
  },
  {
    name: "Amazon",
    color: "#FF9900",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <path fill="#FF9900" d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2z"/>
        <path fill="#FF9900" d="M44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
      </svg>
    ),
  },
  {
    name: "eBay",
    color: "#0064D2",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <path fill="#E53238" d="M8.2 22.8c0-2.9 1.7-5.2 5.1-5.2 3 0 4.7 1.8 4.7 4.8v.7H8.2v-.3z"/>
        <path fill="#0064D2" d="M20.8 25.9v-2.8c0-4.6-2.3-8.3-7.5-8.3-5 0-8 3.5-8 8.6 0 5.4 3.2 8.4 8.3 8.4 3.2 0 5.4-.9 6.7-2.1l-1.7-2.8c-1 .8-2.4 1.4-4.5 1.4-2.5 0-4.3-1.1-4.8-3.6h11.5v.2z"/>
        <path fill="#F5AF02" d="M22.1 31.4V10.3h3.4v8.1c1-2.1 3.2-3.6 6-3.6 4.5 0 7.3 3.5 7.3 8.4 0 5.1-3 8.6-7.5 8.6-2.7 0-4.8-1.4-5.9-3.5v3h-3.3z"/>
        <path fill="#86B817" d="M30.4 28.9c2.6 0 4.5-2.1 4.5-5.6 0-3.4-1.8-5.5-4.4-5.5-2.6 0-4.5 2.2-4.5 5.5 0 3.5 1.9 5.6 4.4 5.6z"/>
      </svg>
    ),
  },
  {
    name: "Flipkart",
    color: "#2874F0",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <rect fill="#2874F0" width="48" height="48" rx="8"/>
        <path fill="#F8E71C" d="M14 12h6l-2 8h6l-10 16 2-10h-5l3-14z"/>
      </svg>
    ),
  },
  {
    name: "Amazon India",
    color: "#FF9900",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <path fill="#FF9900" d="M29.4 17.5c-3.2 0-5.8.7-7.8 2.1-.5.3-.6.8-.3 1.2l1.4 2c.2.3.6.5 1 .5.2 0 .4-.1.6-.2 1.5-1 3.1-1.4 5-1.4 2.1 0 3.7.5 4.8 1.4.6.5 1 1.3 1 2.4v.7c-1.8-.3-3.4-.5-4.9-.5-2.8 0-5.1.6-6.8 1.8-1.8 1.3-2.7 3.2-2.7 5.6 0 2.2.7 3.9 2.1 5.2 1.4 1.2 3.2 1.8 5.5 1.8 2.8 0 5.1-1.1 6.9-3.4v2.4c0 .6.5 1.1 1.1 1.1h2.8c.6 0 1.1-.5 1.1-1.1V25.5c0-2.6-.8-4.6-2.3-6-1.6-1.4-3.9-2-6.5-2z"/>
        <path fill="#FF9900" d="M44.3 35.6c-.3-.1-.6 0-.8.2-2.6 3-6.5 4.8-11.3 5.2-6.1.5-12.6-1.4-18.3-5.3-.2-.2-.5-.2-.8-.1-.2.1-.4.4-.4.7 0 .2.1.4.2.5 6.3 4.4 13.6 6.5 20.5 5.9 5.5-.5 10-2.6 13.1-6.1.2-.2.3-.5.2-.8-.1-.1-.2-.2-.4-.2z"/>
        <circle fill="#138A4A" cx="38" cy="38" r="6"/>
        <text x="35" y="42" fill="white" fontSize="8" fontWeight="bold">.in</text>
      </svg>
    ),
  },
  {
    name: "Meesho",
    color: "#F43397",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <rect fill="#F43397" width="48" height="48" rx="8"/>
        <path fill="white" d="M12 32V16l8 8-8 8zm8-8l8-8v16l-8-8zm8 0l8-8v16l-8-8z"/>
      </svg>
    ),
  },
  {
    name: "Myntra",
    color: "#FF3F6C",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <rect fill="#FF3F6C" width="48" height="48" rx="8"/>
        <path fill="white" d="M14 34V14l10 10 10-10v20l-10-10-10 10z"/>
      </svg>
    ),
  },
  {
    name: "Nykaa",
    color: "#FC2779",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <rect fill="#FC2779" width="48" height="48" rx="8"/>
        <path fill="white" d="M16 14v20l8-10 8 10V14l-8 10-8-10z"/>
      </svg>
    ),
  },
  {
    name: "Snapdeal",
    color: "#E40046",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <rect fill="#E40046" width="48" height="48" rx="8"/>
        <path fill="white" d="M24 10l14 14-14 14-14-14 14-14z"/>
      </svg>
    ),
  },
  {
    name: "TikTok Shop",
    color: "#000000",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48">
        <path fill="#25F4EE" d="M34.1 10.3c-2.1-1.4-3.6-3.6-4.1-6.2h-6.5v27.5c0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5 2.5-5.5 5.5-5.5c.6 0 1.1.1 1.6.3v-6.6c-.5-.1-1.1-.1-1.6-.1-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12V19.1c2.5 1.8 5.5 2.8 8.7 2.8v-6.5c-1.8 0-3.4-.5-4.6-1.1z"/>
        <path fill="#FE2C55" d="M38.7 15.4v-6.5c-1.8 0-3.4-.5-4.6-1.1-2.1-1.4-3.6-3.6-4.1-6.2h-5v27.5c0 3-2.5 5.5-5.5 5.5-1.8 0-3.4-.9-4.4-2.2-2.4-1.5-3.1-4.3-1.6-6.8.9-1.5 2.4-2.5 4.1-2.8v-6.6c-6.6 0-12 5.4-12 12 0 3.8 1.8 7.2 4.6 9.4 2 1.7 4.6 2.6 7.4 2.6 6.6 0 12-5.4 12-12V19.1c2.5 1.8 5.5 2.8 8.7 2.8v-6.5h-.6z"/>
      </svg>
    ),
  },
];

// Calculate position on a circle
function getCirclePosition(index: number, total: number, radius: number) {
  const angle = (index * 360) / total - 90;
  const radian = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radian) * radius,
    y: Math.sin(radian) * radius,
    angle: angle,
  };
}

export function Integrations() {
  const uniqueId = useId();

  const hubSize = {
    width: 750,
    height: 750,
    centerX: 375,
    centerY: 375,
    radius: 280,
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.fade-up');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="integrations" className="py-28 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-100/40 to-emerald-100/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center fade-up mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-5 py-2 text-sm font-medium text-teal-700 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Powered by Real-Time Sync
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-slate-900">Your </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600">Command Center</span>
          </h2>
          <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Connect once, analyze everywhere. ShopIQ syncs with every major marketplace
            to give you unified insights across all your sales channels.
          </p>
        </div>

        {/* Integration Hub Visualization */}
        <div className="fade-up flex justify-center">
          <div
            className="relative"
            style={{
              width: `${hubSize.width}px`,
              height: `${hubSize.height}px`,
            }}
          >
            {/* Orbital rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[600px] h-[600px] rounded-full border border-slate-200/50 absolute animate-spin-slow" style={{ animationDuration: '60s' }} />
              <div className="w-[500px] h-[500px] rounded-full border border-teal-200/30 absolute" />
              <div className="w-[400px] h-[400px] rounded-full border border-slate-200/40 absolute animate-reverse-spin" style={{ animationDuration: '45s' }} />
            </div>

            {/* SVG Layer for wires and particles */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${hubSize.width} ${hubSize.height}`}
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Wire gradient */}
                <linearGradient id={`wire-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1" />
                </linearGradient>

                {/* Glowing particle gradient */}
                <radialGradient id={`particle-gradient-${uniqueId}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#5eead4" />
                  <stop offset="70%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#0d9488" />
                </radialGradient>

                {/* Glow filter */}
                <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Particle glow */}
                <filter id={`particle-glow-${uniqueId}`} x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur1"/>
                  <feGaussianBlur stdDeviation="6" result="blur2"/>
                  <feMerge>
                    <feMergeNode in="blur2"/>
                    <feMergeNode in="blur1"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Render connection lines and particles */}
              {marketplaces.map((marketplace, index) => {
                const pos = getCirclePosition(index, marketplaces.length, hubSize.radius);
                const endX = hubSize.centerX + pos.x;
                const endY = hubSize.centerY + pos.y;

                // Create curved path
                const midX = (hubSize.centerX + endX) / 2;
                const midY = (hubSize.centerY + endY) / 2;
                const dx = endX - hubSize.centerX;
                const dy = endY - hubSize.centerY;
                const len = Math.sqrt(dx * dx + dy * dy);
                const curve = index % 2 === 0 ? 0.15 : -0.15;
                const ctrlX = midX + (-dy / len) * len * curve;
                const ctrlY = midY + (dx / len) * len * curve;

                const pathD = `M ${hubSize.centerX} ${hubSize.centerY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

                return (
                  <g key={`connection-${index}`}>
                    {/* Base wire */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={`url(#wire-gradient-${uniqueId})`}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Animated particles */}
                    <circle
                      r="5"
                      fill={`url(#particle-gradient-${uniqueId})`}
                      filter={`url(#particle-glow-${uniqueId})`}
                      className="energy-particle"
                      style={{
                        offsetPath: `path('${pathD}')`,
                        animationDelay: `${index * 0.25}s`,
                      }}
                    />

                    <circle
                      r="3"
                      fill={`url(#particle-gradient-${uniqueId})`}
                      filter={`url(#particle-glow-${uniqueId})`}
                      className="energy-particle"
                      style={{
                        offsetPath: `path('${pathD}')`,
                        animationDelay: `${index * 0.25 + 1.2}s`,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Center Hub */}
            <div
              className="absolute z-20"
              style={{
                left: `${hubSize.centerX}px`,
                top: `${hubSize.centerY}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Glow effects */}
              <div className="absolute -inset-10 rounded-full bg-gradient-to-r from-teal-200/40 via-emerald-200/30 to-teal-200/40 blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-6 rounded-full bg-teal-100/50 blur-xl" />

              {/* Spinning ring */}
              <div className="absolute -inset-5 rounded-full border-2 border-dashed border-teal-300/50 animate-spin-slow" style={{ animationDuration: '20s' }} />

              {/* Main logo container */}
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-white shadow-xl border-2 border-teal-200 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white" />
                <Image
                  src="/logo.png"
                  alt="ShopIQ"
                  width={100}
                  height={100}
                  className="w-20 h-20 md:w-24 md:h-24 object-contain relative z-10"
                  priority
                />
              </div>

              {/* Pulsing ring */}
              <div className="absolute -inset-2 rounded-full border-2 border-teal-400/40 animate-ping" style={{ animationDuration: '2s' }} />
            </div>

            {/* Marketplace nodes */}
            {marketplaces.map((marketplace, index) => {
              const pos = getCirclePosition(index, marketplaces.length, hubSize.radius);
              const x = hubSize.centerX + pos.x;
              const y = hubSize.centerY + pos.y;

              return (
                <div
                  key={marketplace.name}
                  className="absolute flex flex-col items-center group"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Node container */}
                  <div
                    className="relative w-16 h-16 md:w-18 md:h-18 rounded-full bg-white shadow-lg border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                    style={{
                      borderColor: marketplace.color,
                    }}
                  >
                    {marketplace.logo}
                  </div>

                  {/* Label */}
                  <span className="mt-2 text-xs font-medium text-slate-600 text-center whitespace-nowrap group-hover:text-slate-900 transition-colors">
                    {marketplace.name}
                  </span>

                  {/* Status indicator */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Live</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
