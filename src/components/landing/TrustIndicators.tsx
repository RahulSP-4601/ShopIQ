"use client";

const testimonials = [
  {
    quote: "ShopIQ helped us identify that our electronics sell 3x better on Amazon than Flipkart. We reallocated inventory and saw a 40% revenue increase.",
    author: "Priya Sharma",
    role: "Founder",
    company: "TechGear India",
    revenue: "$2.4M Annual Revenue",
  },
  {
    quote: "Managing 5 marketplaces was a nightmare until ShopIQ. Now I get all my insights in one place and actually understand my business.",
    author: "Rajesh Kumar",
    role: "CEO",
    company: "FashionFirst",
    revenue: "$5.1M Annual Revenue",
  },
  {
    quote: "The AI recommendations alone have paid for the subscription 10x over. It suggested we expand to Meesho and we doubled our Tier 2 city sales.",
    author: "Anita Desai",
    role: "Operations Head",
    company: "HomeStyle Co.",
    revenue: "$1.8M Annual Revenue",
  },
];

const securityBadges = [
  {
    title: "SOC 2 Type II",
    description: "Certified",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
  },
  {
    title: "GDPR",
    description: "Compliant",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    ),
  },
  {
    title: "256-bit",
    description: "Encryption",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    ),
  },
  {
    title: "Read-Only",
    description: "API Access",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
];

const trustedBy = [
  "1,000+ Shopify stores",
  "500+ Amazon sellers",
  "300+ Flipkart vendors",
  "200+ Multi-channel brands",
];

export function TrustIndicators() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Security badges */}
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Enterprise-Grade Security
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            Your data is <span className="text-emerald-600">safe with us</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            We take security seriously. Your business data is protected with bank-grade encryption and compliance.
          </p>
        </div>

        {/* Security badges grid */}
        <div className="fade-up mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {securityBadges.map((badge, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-emerald-200 mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {badge.icon}
                </svg>
              </div>
              <div className="text-lg font-bold text-slate-900">{badge.title}</div>
              <div className="text-sm text-emerald-700">{badge.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="fade-up mt-24">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Trusted by multi-channel sellers
            </h3>
            <p className="mt-2 text-slate-600">
              Join thousands of sellers who grow their business with ShopIQ
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="relative rounded-2xl bg-slate-50 border border-slate-100 p-6"
              >
                <div className="absolute -top-3 left-6">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed mt-2">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </div>
                    <div className="text-xs text-emerald-600 font-medium">{testimonial.revenue}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trusted by logos/stats */}
        <div className="fade-up mt-16 text-center">
          <p className="text-sm font-medium text-slate-500 mb-6">TRUSTED BY</p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {trustedBy.map((item, index) => (
              <div
                key={index}
                className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
