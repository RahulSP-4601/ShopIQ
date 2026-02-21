"use client";

const questions = [
  "What was my revenue last week?",
  "Which products are selling best this month?",
  "Who are my top 10 customers by lifetime value?",
  "What's my average order value trend?",
  "Which products have the highest return rate?",
  "How many new customers did I get this week?",
  "What time of day do I get the most orders?",
  "Compare this month's sales to last month",
];

export function ExampleQuestions() {
  return (
    <section id="questions" className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 mb-4">
            Examples
          </div>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl">
            Ask{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              anything
            </span>{" "}
            about your store
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Here are some questions our users love asking
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {questions.map((question, index) => (
            <QuestionCard key={index} question={question} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuestionCard({ question, index }: { question: string; index: number }) {
  return (
    <div
      className="fade-up group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-5 shadow-lg shadow-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100 hover:border-emerald-200 hover:-translate-y-1 cursor-pointer"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:shadow-lg group-hover:shadow-emerald-500/25">
        <svg
          className="h-5 w-5 text-emerald-600 transition-colors duration-300 group-hover:text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <span className="text-slate-700 font-medium group-hover:text-slate-900">
        {question}
      </span>
      <svg
        className="ml-auto h-5 w-5 text-slate-300 transition-all duration-300 group-hover:text-emerald-500 group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </div>
  );
}
