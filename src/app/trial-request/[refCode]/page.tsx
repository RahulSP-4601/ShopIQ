"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function SalesTrialRequestPage() {
  const params = useParams<{ refCode: string }>();
  const refCode = params.refCode;
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    source: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          companyName: formData.companyName || formData.name,
          refCode,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_45%,_#ecfeff_100%)] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-teal-700">
            Private Trial Access
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
            Start your free 1 month ShopIQ trial
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            This page is only for clients invited by our sales team. Share your details here and
            we will activate your private early-access flow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] sm:p-8">
            {success ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-900">Request received</h2>
                <p className="mt-2 text-slate-600">
                  Your details are now in the private sales pipeline. Your sales contact can send
                  your trial link directly from their dashboard.
                </p>
                <Link
                  href="/signin"
                  className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Already have access? Sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Your Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Work Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="source" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    id="source"
                    name="source"
                    rows={3}
                    maxLength={200}
                    value={formData.source}
                    onChange={handleChange}
                    placeholder="What marketplaces do you sell on, or anything our team should know?"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 font-semibold text-white transition hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Request Private Trial"}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.65)] sm:p-8">
            <h2 className="text-xl font-semibold">How this works</h2>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">1. Private form submission</p>
                <p className="mt-1">Your details go into the internal sales pipeline, not the public signup path.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">2. Trial link sent by sales</p>
                <p className="mt-1">Your sales contact sends a unique 30-day setup link from the dashboard.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">3. Account setup and login</p>
                <p className="mt-1">You create your password, connect marketplaces, and start using ShopIQ.</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-50">
              This page is intentionally not linked from the public site. Access works only when the
              sales team shares your private invite URL.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
