"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  {
    value: "$2B+",
    numericValue: 2,
    prefix: "$",
    suffix: "B+",
    label: "Revenue Analyzed",
    color: "from-teal-500 to-emerald-500",
    borderColor: "border-teal-500",
  },
  {
    value: "50K+",
    numericValue: 50,
    prefix: "",
    suffix: "K+",
    label: "Active Sellers",
    color: "from-blue-500 to-indigo-500",
    borderColor: "border-blue-500",
  },
  {
    value: "9",
    numericValue: 9,
    prefix: "",
    suffix: "",
    label: "Marketplace Integrations",
    color: "from-violet-500 to-purple-500",
    borderColor: "border-violet-500",
  },
  {
    value: "99.9%",
    numericValue: 99.9,
    prefix: "",
    suffix: "%",
    label: "Uptime SLA",
    color: "from-emerald-500 to-green-500",
    borderColor: "border-emerald-500",
  },
];

function CountUpNumber({ stat }: { stat: typeof stats[number] }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const target = stat.numericValue;
          const duration = 1500;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Number((eased * target).toFixed(stat.suffix === "%" ? 1 : 0)));
            if (progress < 1) rafId = requestAnimationFrame(animate);
          };
          rafId = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [hasAnimated, stat.numericValue, stat.suffix]);

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tight">
      {stat.prefix}{count}{stat.suffix}
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="py-16 bg-slate-900 relative overflow-hidden">
      {/* Subtle bg texture */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="fade-up text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className={`h-1 w-12 mx-auto mb-4 rounded-full bg-gradient-to-r ${stat.color}`} />
              <CountUpNumber stat={stat} />
              <div className="mt-2 text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
