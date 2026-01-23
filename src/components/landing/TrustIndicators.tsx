"use client";

const testimonials = [
  {
    quote: "ShopIQ helped us identify that our electronics sell 3x better on Amazon than Flipkart. We reallocated inventory and saw a 40% revenue increase.",
    author: "Priya Sharma",
    role: "Founder, TechGear India",
    metric: "$2.4M Revenue",
    color: "from-teal-500 to-emerald-500",
  },
  {
    quote: "Managing 5 marketplaces was a nightmare until ShopIQ. Now I get all my insights in one place and actually understand my business.",
    author: "Rajesh Kumar",
    role: "CEO, FashionFirst",
    metric: "$5.1M Revenue",
    color: "from-violet-500 to-purple-500",
  },
  {
    quote: "The AI recommendations alone have paid for the subscription 10x over. It suggested we expand to Meesho and we doubled our Tier 2 sales.",
    author: "Anita Desai",
    role: "Operations Head, HomeStyle",
    metric: "$1.8M Revenue",
    color: "from-blue-500 to-indigo-500",
  },
];

const securityFeatures = [
  { title: "SOC 2 Type II", description: "Certified", color: "from-teal-500 to-emerald-500", icon: "shield" },
  { title: "GDPR", description: "Compliant", color: "from-violet-500 to-purple-500", icon: "check" },
  { title: "256-bit", description: "Encryption", color: "from-blue-500 to-indigo-500", icon: "lock" },
  { title: "Read-Only", description: "API Access", color: "from-orange-500 to-amber-500", icon: "key" },
];

export function TrustIndicators() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Security Section */}
        <div className="text-center fade-up max-w-2xl mx-auto">
          <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
            Security
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Enterprise-grade protection
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Your business data is protected with bank-grade encryption and compliance standards.
          </p>
        </div>

        {/* Security badges */}
        <div className="fade-up mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 max-w-3xl mx-auto">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-6 rounded-2xl bg-white border border-slate-100 text-center hover:shadow-lg transition-all duration-300 group"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-3 group-hover:scale-110 transition-transform`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div className="font-semibold text-slate-900">{feature.title}</div>
              <div className="text-sm text-slate-500">{feature.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="fade-up mt-24">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-teal-600 uppercase tracking-wider mb-3">
              Testimonials
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Trusted by thousands of sellers
            </h3>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="relative rounded-2xl bg-white border border-slate-100 p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group"
              >
                {/* Quote mark */}
                <div className="absolute -top-4 left-8">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.color} text-white shadow-lg`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                </div>

                <p className="text-slate-600 leading-relaxed mt-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-semibold shadow-lg`}>
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.author}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                    <div className={`text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r ${testimonial.color} mt-0.5`}>{testimonial.metric}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trusted by section */}
        <div className="fade-up mt-16 text-center">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-6">
            Trusted by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { text: "1,000+ Shopify stores", color: "from-green-500 to-emerald-500" },
              { text: "500+ Amazon sellers", color: "from-orange-500 to-amber-500" },
              { text: "300+ Flipkart vendors", color: "from-blue-500 to-indigo-500" },
              { text: "200+ Multi-channel brands", color: "from-violet-500 to-purple-500" },
            ].map((item, index) => (
              <div
                key={index}
                className="px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className={`text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r ${item.color}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
