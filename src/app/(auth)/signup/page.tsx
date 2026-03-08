import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-8 md:p-10 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Signup Is Closed</h1>
        <p className="mt-3 text-slate-600">
          Public account creation is paused for now. Join the waitlist and we will notify you when access opens.
        </p>

        <Link
          href="/waitlist"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 text-base font-semibold text-white hover:from-teal-600 hover:to-emerald-600 transition-all"
        >
          Join Waitlist
        </Link>

        <p className="mt-4 text-sm text-slate-600">
          Already invited? Use{" "}
          <Link href="/signin" className="ml-1 font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
