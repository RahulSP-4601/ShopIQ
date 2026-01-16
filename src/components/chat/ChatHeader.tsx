"use client";

interface ChatHeaderProps {
  isConnected: boolean;
}

export function ChatHeader({ isConnected }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/25">
            S
          </div>
          <span className="text-lg font-bold text-slate-900">ShopIQ</span>
        </a>

      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Connected
          </div>
        ) : (
          <a
            href="/connect"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.337 23.979l2.628-17.744-4.142.949-.837 5.622s-1.073-.555-2.396-.44c-1.94.17-1.963 1.34-1.946 1.646.09 1.605 4.27 1.954 4.503 5.692.182 2.94-1.56 4.95-4.067 5.107-3.013.19-4.674-1.588-4.674-1.588l.64-2.72s1.667 1.254 3 1.167c.87-.057 1.18-.762 1.148-1.264-.117-2.094-3.53-1.97-3.75-5.384-.185-2.87 1.703-5.778 5.858-6.042 1.613-.102 2.435.309 2.435.309l1.2-4.79s-1.123-.48-3.05-.387C6.7 4.286 4.5 7.77 4.5 11.5c0 6.35 4.39 9.676 4.39 9.676l-.86 3.3s2.058.75 4.53.533c2.932-.258 5.28-1.68 6.777-5.03z" />
            </svg>
            Connect Shopify
          </a>
        )}
      </div>
    </header>
  );
}
