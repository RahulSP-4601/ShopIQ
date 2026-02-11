"use client";

import React, { useId, useEffect } from "react";
import Image from "next/image";

// Marketplace configurations with SVG logos
const marketplaces = [
  {
    name: "Shopify",
    color: "#95BF47",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 109 124" fill="none">
        <path
          d="M95.602 23.457c-.103-.704-.692-1.074-1.18-1.108-.487-.034-10.312-.792-10.312-.792s-6.84-6.636-7.576-7.372c-.736-.736-2.175-.513-2.733-.342-.017 0-1.469.452-3.938 1.214-2.35-6.784-6.5-13.015-13.783-13.015-.204 0-.412.013-.624.026C53.81.171 51.796 0 50.08 0 33.91 0 26.16 20.19 23.552 30.458c-7.73 2.392-13.228 4.095-13.929 4.32-4.342 1.367-4.48 1.504-5.046 5.606C4.1 43.782 0 100.14 0 100.14l75.84 13.09 38.16-9.52s-18.206-79.55-18.398-80.253z"
          fill="#95BF47"
        />
        <path
          d="M55.42 40.129l-4.85 14.422s-4.255-2.268-9.44-2.268c-7.626 0-8.003 4.782-8.003 5.988 0 6.574 17.138 9.094 17.138 24.508 0 12.123-7.695 19.926-18.075 19.926-12.464 0-18.835-7.762-18.835-7.762l3.34-11.012s6.556 5.633 12.086 5.633c3.622 0 5.09-2.853 5.09-4.937 0-8.62-14.065-9.003-14.065-23.078 0-11.874 8.51-23.364 25.694-23.364 6.623 0 9.92 1.944 9.92 1.944z"
          fill="#fff"
        />
      </svg>
    ),
  },
  {
    name: "Amazon",
    color: "#FF9900",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <path
          d="M29.62 29.284c-5.296 3.908-12.972 5.988-19.584 5.988-9.264 0-17.604-3.424-23.916-9.124-.496-.448-.052-1.06.544-.712 6.816 3.964 15.24 6.348 23.94 6.348 5.868 0 12.324-1.216 18.264-3.736.896-.38 1.648.592.752 1.236z"
          transform="translate(10 8)"
          fill="#FF9900"
        />
        <path
          d="M31.768 26.816c-.676-.864-4.48-.408-6.188-.204-.52.06-.6-.392-.132-.72 3.028-2.132 8-1.516 8.584-.8.584.716-.152 5.684-2.996 8.052-.436.364-.852.172-.66-.312.64-1.6 2.072-5.152 1.392-6.016z"
          transform="translate(10 8)"
          fill="#FF9900"
        />
      </svg>
    ),
  },
  {
    name: "eBay",
    color: "#E53238",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <path fill="#E53238" d="M5.256 18.24c0-4.776 2.76-7.2 7.224-7.2 5.568 0 7.128 3.744 7.128 7.536v1.368H8.136c.072 2.904 1.944 4.536 4.92 4.536 2.568 0 4.248-.888 5.04-1.488l1.08 2.808c-1.2.912-3.336 1.8-6.264 1.8-5.304 0-7.656-3.12-7.656-7.56z"/>
        <path fill="#0064D2" d="M20.76 27.24V6.768h3.12V13.2c1.032-1.2 2.76-2.16 5.16-2.16 4.008 0 7.08 2.88 7.08 8.424 0 5.76-3.216 8.136-7.248 8.136-2.28 0-3.864-.84-5.016-2.088v1.728H20.76z"/>
        <path fill="#F5AF02" d="M36.888 20.4c0-4.8 2.664-9.36 8.136-9.36 2.712 0 4.56 1.104 5.616 2.28v-2.016h3.12v16.8c0 5.664-3.024 8.616-8.304 8.616-3.168 0-5.64-.984-7.248-2.232l1.344-2.64c1.392 1.056 3.384 1.92 5.832 1.92 3.528 0 5.256-1.896 5.256-5.424v-1.44c-1.032 1.2-2.928 2.328-5.616 2.328-5.4 0-8.136-4.056-8.136-8.832z"/>
        <path fill="#86B817" d="M28.128 18.336c-2.328 0-4.248 1.512-4.248 5.04 0 3.6 1.92 5.136 4.248 5.136 2.352 0 4.2-1.44 4.2-5.112 0-3.72-1.848-5.064-4.2-5.064z"/>
      </svg>
    ),
  },
  {
    name: "Etsy",
    color: "#F56400",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <path d="M24 48c13.255 0 24-10.745 24-24S37.255 0 24 0 0 10.745 0 24s10.745 24 24 24z" fill="#F56400"/>
        <path d="M13.2 14.4c0-.48.24-.72.84-.72h9.72c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-6.72v5.4h5.76c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-5.76v5.88h6.96c.48 0 .6.24.6.6v2.04c0 .36-.12.6-.6.6h-9.96c-.6 0-.84-.24-.84-.72V14.4z" fill="#fff"/>
      </svg>
    ),
  },
  {
    name: "BigCommerce",
    color: "#121118",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <path d="M0 24C0 10.745 10.745 0 24 0s24 10.745 24 24-10.745 24-24 24S0 37.255 0 24z" fill="#121118"/>
        <path d="M11.4 15.6h8.4c2.76 0 4.68 1.08 4.68 3.36 0 1.56-.96 2.64-2.4 3.12v.12c1.92.36 3.12 1.56 3.12 3.48 0 2.52-2.04 3.72-5.04 3.72H11.4V15.6zm7.56 5.64c1.32 0 2.04-.6 2.04-1.56s-.72-1.44-2.04-1.44H14.4v3h4.56zm.48 6c1.44 0 2.28-.6 2.28-1.68s-.84-1.56-2.28-1.56H14.4v3.24h5.04z" fill="#fff"/>
        <path d="M35.28 26.76c-.36 1.8-1.56 3-3.6 3-2.4 0-3.96-1.68-3.96-4.44 0-2.76 1.56-4.44 3.96-4.44 2.04 0 3.24 1.2 3.6 3h3.12c-.48-3.48-3-5.88-6.72-5.88-4.32 0-7.2 3-7.2 7.32s2.88 7.32 7.2 7.32c3.72 0 6.24-2.4 6.72-5.88h-3.12z" fill="#fff"/>
      </svg>
    ),
  },
  {
    name: "Square",
    color: "#006AFF",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="8" fill="#006AFF"/>
        <path d="M12 15.6c0-1.98 1.62-3.6 3.6-3.6h16.8c1.98 0 3.6 1.62 3.6 3.6v16.8c0 1.98-1.62 3.6-3.6 3.6H15.6c-1.98 0-3.6-1.62-3.6-3.6V15.6z" fill="#fff"/>
        <path d="M18 21.6c0-.66.54-1.2 1.2-1.2h9.6c.66 0 1.2.54 1.2 1.2v4.8c0 .66-.54 1.2-1.2 1.2h-9.6c-.66 0-1.2-.54-1.2-1.2v-4.8z" fill="#006AFF"/>
      </svg>
    ),
  },
  {
    name: "PrestaShop",
    color: "#DF0067",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <path d="M24 48c13.255 0 24-10.745 24-24S37.255 0 24 0 0 10.745 0 24s10.745 24 24 24z" fill="#DF0067"/>
        <path d="M33.6 16.8c0-3.84-3.12-6.96-6.96-6.96h-7.68v6.96h7.68c0 3.84-3.12 6.96-6.96 6.96h-.72v6.96h.72c7.68 0 13.92-6.24 13.92-13.92z" fill="#fff"/>
        <path d="M18.96 23.76h-4.8v14.4h4.8v-14.4z" fill="#fff"/>
      </svg>
    ),
  },
  {
    name: "Flipkart",
    color: "#2874F0",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="8" fill="#2874F0"/>
        <path d="M16 12h12v4H20v6h7v4h-7v10h-4V12z" fill="#FFE500"/>
        <path d="M30 32c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" fill="#FFE500"/>
      </svg>
    ),
  },
  {
    name: "SnapDeal",
    color: "#E40046",
    logo: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="8" fill="#E40046"/>
        <path d="M24 10c-7.732 0-14 6.268-14 14s6.268 14 14 14 14-6.268 14-14-6.268-14-14-14zm5.6 20.3c-1.4 1.4-3.3 2.1-5.6 2.1-2.3 0-4.2-.7-5.6-2.1-1.4-1.4-2.1-3.3-2.1-5.6h3.5c0 1.3.4 2.4 1.2 3.2.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2c.8-.8 1.2-1.9 1.2-3.2s-.4-2.4-1.2-3.2c-.8-.8-1.8-1.2-3-1.2v-3.5c2.3 0 4.2.7 5.6 2.1 1.4 1.4 2.1 3.3 2.1 5.6 0 2.6-.7 4.5-2.1 5.8z" fill="#fff"/>
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
    <section id="integrations" className="py-12 md:py-20 lg:py-28 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-slate-900">Your </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600">Command Center</span>
          </h2>
          <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Connect once, analyze everywhere. Frame syncs with every major marketplace
            to give you unified insights across all your sales channels.
          </p>
        </div>

        {/* Integration Hub Visualization */}
        <div className="fade-up flex justify-center overflow-hidden -mb-[200px] sm:-mb-[150px] md:-mb-[80px] lg:-mb-[30px] xl:mb-0">
          {/* Responsive scaling wrapper */}
          <div className="transform scale-[0.38] sm:scale-[0.50] md:scale-[0.7] lg:scale-[0.85] xl:scale-100 origin-top transition-transform duration-300">
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
                  alt="Frame"
                  width={130}
                  height={130}
                  className="w-32 h-32 md:w-36 md:h-36 object-contain relative z-10"
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

      </div>
    </section>
  );
}
