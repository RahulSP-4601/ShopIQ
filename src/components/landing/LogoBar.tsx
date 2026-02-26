"use client";

const marketplaceLogos = [
  {
    name: "Shopify",
    logo: (
      <svg className="h-7 w-auto" viewBox="0 0 109 124" fill="none">
        <path d="M95.602 23.457c-.103-.704-.692-1.074-1.18-1.108-.487-.034-10.312-.792-10.312-.792s-6.84-6.636-7.576-7.372c-.736-.736-2.175-.513-2.733-.342-.017 0-1.469.452-3.938 1.214-2.35-6.784-6.5-13.015-13.783-13.015-.204 0-.412.013-.624.026C53.81.171 51.796 0 50.08 0 33.91 0 26.16 20.19 23.552 30.458c-7.73 2.392-13.228 4.095-13.929 4.32-4.342 1.367-4.48 1.504-5.046 5.606C4.1 43.782 0 100.14 0 100.14l75.84 13.09 38.16-9.52s-18.206-79.55-18.398-80.253z" fill="#96BF48"/>
      </svg>
    ),
  },
  {
    name: "Amazon",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 120 36" fill="none">
        <path d="M69.2 28.2c-8.1 6-19.8 9.2-29.9 9.2-14.2 0-26.9-5.2-36.6-14 -.8-.7-.1-1.6.8-1.1 10.4 6.1 23.3 9.7 36.6 9.7 9 0 18.8-1.9 27.9-5.7 1.4-.6 2.5.9 1.2 1.9z" fill="#FF9900"/>
        <path d="M72.5 24.5c-1-.3-6.9-.6-9.5-.3-.8.1-.9-.6-.2-1.1 4.6-3.3 12.2-2.3 13.1-1.2.9 1.1-.2 8.7-4.6 12.3-.7.6-1.3.3-1-.5 1-2.4 3.2-7.9 2.2-9.2z" fill="#FF9900"/>
      </svg>
    ),
  },
  {
    name: "eBay",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 80 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="24">
          <tspan fill="#E53238">e</tspan>
          <tspan fill="#0064D2">B</tspan>
          <tspan fill="#F5AF02">a</tspan>
          <tspan fill="#86B817">y</tspan>
        </text>
      </svg>
    ),
  },
  {
    name: "Etsy",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 56 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="24" fill="#F1641E">Etsy</text>
      </svg>
    ),
  },
  {
    name: "Flipkart",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 90 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22" fill="#2874F0">Flipkart</text>
      </svg>
    ),
  },
  {
    name: "BigCommerce",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 140 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20" fill="#121118">BigCommerce</text>
      </svg>
    ),
  },
  {
    name: "Square",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 80 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="22" fill="#006AFF">Square</text>
      </svg>
    ),
  },
  {
    name: "Wix",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 46 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="24" fill="#0C6EFC">Wix</text>
      </svg>
    ),
  },
  {
    name: "WooCommerce",
    logo: (
      <svg className="h-6 w-auto" viewBox="0 0 150 28" fill="none">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20" fill="#96588A">WooCommerce</text>
      </svg>
    ),
  },
];

export function LogoBar() {
  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-sm text-slate-400 uppercase tracking-widest font-medium mb-8">
          Connecting sellers across the world&apos;s top marketplaces
        </p>

        {/* Desktop: static row */}
        <div className="hidden md:flex items-center justify-between gap-8">
          {marketplaceLogos.map((mp) => (
            <div
              key={mp.name}
              className="opacity-70 hover:opacity-100 transition-opacity duration-300 cursor-default"
              title={mp.name}
            >
              {mp.logo}
            </div>
          ))}
        </div>

        {/* Mobile: scrolling marquee */}
        <div className="md:hidden overflow-hidden">
          <div className="flex items-center gap-12 animate-marquee">
            {[...marketplaceLogos, ...marketplaceLogos].map((mp, i) => (
              <div
                key={`${mp.name}-${i}`}
                className="shrink-0 opacity-80"
              >
                {mp.logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
