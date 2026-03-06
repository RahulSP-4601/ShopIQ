"use client";

export function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {/* Very subtle gradient orbs for premium feel */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-100/50 rounded-full blur-3xl opacity-60" />
      <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-slate-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-slate-100/30 rounded-full blur-3xl opacity-40" />

      {/* Very subtle noise texture overlay for premium feel */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
