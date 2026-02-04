"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

interface SalesClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  trialToken: string | null;
  trialSentAt: string | null;
  clientUserId: string | null;
  createdAt: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  refCode: string;
  clientCount: number;
  totalCommission: number;
  commissions: { id: string; amount: string; note: string | null; createdAt: string }[];
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalesDashboardPage() {
  const router = useRouter();

  // Prevent stale page from bfcache when user presses back after sign-out
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetch("/api/auth/verify-employee", { cache: "no-store" }).then((res) => {
          if (!res.ok) router.replace("/signin");
        }).catch(() => router.replace("/signin"));
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  const [clients, setClients] = useState<SalesClient[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [origin, setOrigin] = useState("");
  const [fetchError, setFetchError] = useState("");

  // Trial link state
  const [trialLink, setTrialLink] = useState("");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialCopied, setTrialCopied] = useState(false);
  const [sendingTrial, setSendingTrial] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setFetchError("");
    try {
      const [clientsRes, profileRes] = await Promise.all([
        fetch("/api/sales/clients"),
        fetch("/api/sales/profile"),
      ]);
      if (!clientsRes.ok || !profileRes.ok) {
        setFetchError("Failed to load dashboard data. Please try again.");
        return;
      }
      const clientsData = await clientsRes.json();
      const profileData = await profileRes.json();
      setClients(clientsData.clients || []);
      setProfile(profileData.profile || null);
    } catch {
      setFetchError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Build all available months from clients + commissions
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(getCurrentMonthKey());
    clients.forEach((c) => monthSet.add(getMonthKey(c.createdAt)));
    profile?.commissions?.forEach((c) => monthSet.add(getMonthKey(c.createdAt)));
    return Array.from(monthSet).sort().reverse();
  }, [clients, profile]);

  // Filtered data for selected month
  const filteredClients = useMemo(() =>
    clients.filter((c) => getMonthKey(c.createdAt) === selectedMonth),
    [clients, selectedMonth]
  );

  const filteredConvertedCount = useMemo(() =>
    filteredClients.filter((c) => c.status === "CONVERTED").length,
    [filteredClients]
  );

  const filteredCommissions = useMemo(() =>
    (profile?.commissions || []).filter((c) => getMonthKey(c.createdAt) === selectedMonth),
    [profile, selectedMonth]
  );

  const filteredCommissionTotal = useMemo(() =>
    filteredCommissions.reduce((sum, c) => sum + Number(c.amount), 0),
    [filteredCommissions]
  );

  // Daily conversion data for graph within selected month
  const dailyData = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const counts: number[] = new Array(daysInMonth).fill(0);

    clients.forEach((c) => {
      if (c.status === "CONVERTED" && getMonthKey(c.createdAt) === selectedMonth) {
        const day = new Date(c.createdAt).getDate();
        counts[day - 1]++;
      }
    });

    // Cumulative up to today only
    const now = new Date();
    const isCurrentMonth = getMonthKey(now.toISOString()) === selectedMonth;
    const today = isCurrentMonth ? now.getDate() : daysInMonth;

    const cumulative: number[] = [];
    let total = 0;
    for (let i = 0; i < daysInMonth; i++) {
      if (i < today) {
        total += counts[i];
        cumulative.push(total);
      } else {
        cumulative.push(-1); // future day marker
      }
    }
    return { cumulative, counts, daysInMonth };
  }, [clients, selectedMonth]);

  const maxDailyConv = useMemo(() =>
    Math.max(1, ...dailyData.cumulative.filter((v) => v >= 0)),
    [dailyData]
  );

  const [signOutError, setSignOutError] = useState("");

  const handleSignOut = async () => {
    setSignOutError("");
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        setSignOutError("Failed to sign out.");
        return;
      }
      router.replace("/signin");
    } catch {
      setSignOutError("Failed to sign out.");
    }
  };

  const copyRefLink = async () => {
    if (!profile?.refCode) return;
    const link = `${origin}?ref=${profile.refCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore if clipboard API unavailable
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/sales/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add client");
        return;
      }
      setShowAddModal(false);
      setAddForm({ name: "", email: "", phone: "" });
      fetchData();
    } catch {
      setAddError("Failed to add client");
    } finally {
      setAdding(false);
    }
  };

  const handleSendTrial = async (clientId: string) => {
    setSendingTrial(clientId);
    try {
      const res = await fetch(`/api/sales/clients/${clientId}/send-trial`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send trial");
        return;
      }
      setTrialLink(data.trialLink);
      setShowTrialModal(true);
      fetchData();
    } catch {
      alert("Failed to send trial");
    } finally {
      setSendingTrial(null);
    }
  };

  const copyTrialLink = async () => {
    try {
      await navigator.clipboard.writeText(trialLink);
      setTrialCopied(true);
      setTimeout(() => setTrialCopied(false), 2000);
    } catch {
      // Fallback: ignore if clipboard API unavailable
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-sm text-gray-500">{profile?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {signOutError && <span className="text-sm text-red-600">{signOutError}</span>}
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-600">{fetchError}</p>
            <button onClick={fetchData} className="text-sm text-red-600 underline hover:text-red-800 cursor-pointer">Retry</button>
          </div>
        )}
        {/* Referral Link */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Your Referral Link</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-50 border border-gray-200 text-sm text-gray-700 px-4 py-2.5 rounded-lg truncate">
              {profile?.refCode
                ? `${origin}?ref=${profile.refCode}`
                : "—"}
            </code>
            <button
              onClick={copyRefLink}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{formatMonthLabel(selectedMonth)}</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Total Clients</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{filteredClients.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Converted</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{filteredConvertedCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Commission</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              ${filteredCommissionTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Daily Conversions Graph */}
        {dailyData.cumulative.some((v) => v > 0) && (() => {
          const totalSoFar = Math.max(0, ...dailyData.cumulative.filter((v) => v >= 0));
          return (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500">Conversions — {formatMonthLabel(selectedMonth)}</h2>
                <span className="text-sm font-medium text-gray-700">{totalSoFar} total</span>
              </div>
              <div className="flex items-end gap-px h-40">
                {dailyData.cumulative.map((count, i) => {
                  const isFuture = count === -1;
                  const hadSaleToday = dailyData.counts[i] > 0;
                  const prevCum = i > 0 ? dailyData.cumulative[i - 1] : 0;
                  const hadPriorSales = prevCum > 0;
                  // green = sale happened today, red = no sale but had prior sales, grey = future or no sales yet
                  const barColor = isFuture ? "bg-gray-300"
                    : hadSaleToday ? "bg-green-400"
                    : hadPriorSales ? "bg-red-400"
                    : "bg-gray-200";
                  const displayCount = isFuture ? 0 : count;
                  // All bars get full height; green/red bars use cumulative %, grey/future fill fully
                  const needsFullHeight = isFuture || (!hadSaleToday && !hadPriorSales) || (hadPriorSales && !hadSaleToday);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className={`w-full rounded-t-sm transition-all ${barColor}`}
                        style={{ height: needsFullHeight ? "100%" : `${displayCount > 0 ? (displayCount / maxDailyConv) * 100 : 0}%`, minHeight: displayCount > 0 ? 4 : 4, opacity: isFuture ? 0.3 : needsFullHeight ? 0.5 : 1 }}
                      />
                      {!isFuture && (
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                          Day {i + 1}: {dailyData.counts[i]} sale{dailyData.counts[i] !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">1</span>
                <span className="text-[10px] text-gray-400">{dailyData.daysInMonth}</span>
              </div>
            </div>
          );
        })()}

        {/* Client Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Clients ({filteredClients.length})</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              + Add Client
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Phone</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      No clients this month.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-900">{c.name}</td>
                      <td className="px-5 py-3 text-gray-600">{c.email}</td>
                      <td className="px-5 py-3 text-gray-600">{c.phone || "—"}</td>
                      <td className="px-5 py-3">
                        {c.status === "CONVERTED" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">CONVERTED</span>
                        ) : c.clientUserId && c.trialSentAt ? (() => {
                          const daysLeft = Math.max(0, Math.ceil((new Date(c.trialSentAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
                          return (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${daysLeft > 0 ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"}`}>
                              {daysLeft > 0 ? `Trial (${daysLeft}d left)` : "Trial Expired"}
                            </span>
                          );
                        })() : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.status === "CONTACTED" ? "bg-blue-100 text-blue-700"
                              : c.status === "DECLINED" ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>{c.status}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        {c.status === "CONVERTED" ? (
                          <span className="text-xs text-green-600 font-medium">Subscribed</span>
                        ) : !c.trialToken && c.status === "PENDING" ? (
                          <button
                            onClick={() => handleSendTrial(c.id)}
                            disabled={sendingTrial === c.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {sendingTrial === c.id ? "Sending..." : "Send Trial"}
                          </button>
                        ) : c.trialToken && !c.clientUserId ? (
                          <span className="text-xs text-blue-600 font-medium">Trial Sent</span>
                        ) : c.clientUserId ? (
                          <span className="text-xs text-green-600 font-medium">Trial Active</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission History */}
        {filteredCommissions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Commission History</h2>
              <span className="text-sm text-green-600 font-medium">
                Total: ${filteredCommissionTotal.toFixed(2)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left px-5 py-3 font-medium">Amount</th>
                    <th className="text-left px-5 py-3 font-medium">Note</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100">
                      <td className="px-5 py-3 text-green-600 font-medium">${Number(c.amount).toFixed(2)}</td>
                      <td className="px-5 py-3 text-gray-600">{c.note || "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Client</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddForm({ name: "", email: "", phone: "" }); setAddError(""); }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {adding ? "Adding..." : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trial Link Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Trial Link Generated</h2>
            <p className="text-sm text-gray-500 mb-4">Share this link with your client to start their 30-day free trial.</p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 bg-gray-50 border border-gray-200 text-sm text-gray-700 px-3 py-2.5 rounded-lg truncate">
                {trialLink}
              </code>
              <button
                onClick={copyTrialLink}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {trialCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => { setShowTrialModal(false); setTrialLink(""); setTrialCopied(false); }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
