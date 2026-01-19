"use client";

const steps = [
  {
    step: "1",
    title: "Connect Your Store",
    description: "Quick and easy setup. We securely sync your orders, products, and customer data.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    ),
  },
  {
    step: "2",
    title: "Ask Questions",
    description: "Type your questions in plain English. Our AI understands context and delivers precise answers.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    ),
  },
  {
    step: "3",
    title: "Get Insights",
    description: "Receive instant answers, detailed reports, and actionable recommendations to grow your business.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 mb-4">
            How it Works
          </div>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Get started in{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              3 simple steps
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From connection to insights in under a minute
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((item, index) => (
            <StepCard key={index} item={item} index={index} isLast={index === steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ item, index, isLast }: { item: typeof steps[0]; index: number; isLast: boolean }) {
  return (
    <div className="fade-up relative text-center group" style={{ animationDelay: `${index * 0.15}s` }}>
      {!isLast && (
        <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-200 to-transparent" />
      )}
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-bold text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-emerald-500/40">
        {item.step}
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20 blur-lg transition-opacity duration-300 group-hover:opacity-40" />
      </div>
      <div className="mt-6 mb-3 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition-colors duration-300 group-hover:bg-emerald-100">
          <svg
            className="h-6 w-6 text-slate-600 transition-colors duration-300 group-hover:text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {item.icon}
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-900">
        {item.title}
      </h3>
      <p className="mt-2 text-slate-600 max-w-xs mx-auto">
        {item.description}
      </p>
    </div>
  );
}
