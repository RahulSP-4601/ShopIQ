"use client";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-110">
            S
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            ShopIQ
          </span>
        </div>
        <div className="flex items-center gap-8">
          <a
            href="#features"
            className="text-sm text-slate-500 transition-colors duration-200 hover:text-slate-900"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-slate-500 transition-colors duration-200 hover:text-slate-900"
          >
            How it Works
          </a>
          <a
            href="#questions"
            className="text-sm text-slate-500 transition-colors duration-200 hover:text-slate-900"
          >
            Examples
          </a>
        </div>
      </div>
    </nav>
  );
}
