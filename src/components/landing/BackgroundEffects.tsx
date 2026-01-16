"use client";

export function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-100 opacity-60 blur-3xl animate-blob" />
      <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-teal-100 opacity-60 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-cyan-100 opacity-60 blur-3xl animate-blob animation-delay-4000" />
    </div>
  );
}
