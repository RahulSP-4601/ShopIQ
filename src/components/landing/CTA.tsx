"use client";

export function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-12 text-center shadow-2xl shadow-emerald-500/25">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white/10 blur-2xl animate-blob" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-white/10 blur-2xl animate-blob animation-delay-2000" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Ready to understand your store better?
            </h2>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
              Join hundreds of Shopify store owners who save hours every week with
              ShopIQ.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#demo"
                className="group relative overflow-hidden flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-emerald-600 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  See How It Works
                  <svg
                    className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </a>
              <a
                href="/contact"
                className="flex h-14 items-center justify-center rounded-full border-2 border-white/30 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/50"
              >
                Talk to Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
