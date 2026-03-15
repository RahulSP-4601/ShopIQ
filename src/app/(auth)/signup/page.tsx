"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country,
      password: formData.password,
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      router.push(data.redirect || "/onboarding/connect");
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 p-8 md:p-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-slate-600">
            Start your onboarding and connect your marketplaces
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="Rahul Panchal"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1.5">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                autoComplete="country-name"
                required
                value={formData.country}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="India"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1.5">
                City (optional)
              </label>
              <input
                id="city"
                name="city"
                type="text"
                autoComplete="address-level2"
                value={formData.city}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="Ahmedabad"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1.5">
                State (optional)
              </label>
              <input
                id="state"
                name="state"
                type="text"
                autoComplete="address-level1"
                value={formData.state}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="Gujarat"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="zipCode" className="block text-sm font-medium text-slate-700 mb-1.5">
                ZIP / Postal Code (optional)
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                autoComplete="postal-code"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="380015"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-emerald-600 hover:shadow-xl hover:shadow-teal-500/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
