"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// Standardized date formatter for consistent locale
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US");

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isApproved: boolean;
  refCode: string | null;
  createdAt: string;
  clientCount: number;
  totalCommission: number;
}

interface SalesClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  salesMember?: { id: string; name: string; email: string };
}

interface Commission {
  id: string;
  amount: string;
  note: string | null;
  createdAt: string;
}

type Tab = "team" | "clients";

export default function FounderDashboardPage() {
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

  const [tab, setTab] = useState<Tab>("team");
  const [members, setMembers] = useState<Member[]>([]);
  const [allClients, setAllClients] = useState<SalesClient[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberClients, setMemberClients] = useState<SalesClient[]>([]);
  const [memberCommissions, setMemberCommissions] = useState<Commission[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [commForm, setCommForm] = useState({ amount: "", note: "" });
  const [commAdding, setCommAdding] = useState(false);
  const [commMonthFilter, setCommMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "", commissionRate: "" });
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ name: string; email: string; refCode: string } | null>(null);
  const [membersError, setMembersError] = useState("");
  const [clientsError, setClientsError] = useState("");
  const [commError, setCommError] = useState("");

  // Refs for invite modal accessibility
  const inviteModalRef = useRef<HTMLDivElement>(null);
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = useCallback(async () => {
    setMembersError("");
    try {
      const res = await fetch("/api/founder/members");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setMembersError("Failed to load team data. Please try again.");
    }
  }, []);

  const fetchAllClients = useCallback(async () => {
    setClientsError("");
    try {
      const res = await fetch("/api/founder/clients");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllClients(data.clients || []);
    } catch {
      setClientsError("Failed to load client data. Please try again.");
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchAllClients()]).finally(() =>
      setLoading(false)
    );
  }, [fetchMembers, fetchAllClients]);

  // Invite modal accessibility: focus trap, escape key, restore focus
  useEffect(() => {
    if (!showInviteModal) return;

    // Focus first input when modal opens
    setTimeout(() => firstInputRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        setShowInviteModal(false);
        setInviteForm({ name: "", email: "", phone: "", commissionRate: "" });
        setInviteError("");
        inviteButtonRef.current?.focus();
      }
      // Focus trap
      if (e.key === "Tab" && inviteModalRef.current) {
        const focusable = inviteModalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showInviteModal]);

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

  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/founder/members/${id}/approve`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Failed to approve member");
        return;
      }
      fetchMembers();
    } catch (error) {
      console.error("Approve error:", error);
      setActionError("Network error. Please try again.");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and delete this member?"))
      return;
    setActionError(null);
    try {
      const res = await fetch(`/api/founder/members/${id}/reject`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Failed to reject member");
        return;
      }
      fetchMembers();
    } catch (error) {
      console.error("Reject error:", error);
      setActionError("Network error. Please try again.");
    }
  };

  const openMemberDetail = async (member: Member) => {
    setSelectedMember(member);
    setLoadingDetail(true);
    try {
      const [clientsRes, commRes] = await Promise.all([
        fetch(`/api/founder/members/${member.id}/clients`),
        fetch(`/api/founder/members/${member.id}/commission`),
      ]);
      if (!clientsRes.ok || !commRes.ok) {
        setActionError("Failed to load member details. Please try again.");
        setSelectedMember(null);
        return;
      }
      const clientsData = await clientsRes.json();
      const commData = await commRes.json();
      setMemberClients(clientsData.clients || []);
      setMemberCommissions(commData.commissions || []);
    } catch {
      setActionError("Failed to load member details. Please try again.");
      setSelectedMember(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setCommAdding(true);
    setCommError("");
    try {
      const res = await fetch(
        `/api/founder/members/${selectedMember.id}/commission`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commForm),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCommError(data.error || "Failed to add commission");
        return;
      }
      setCommForm({ amount: "", note: "" });
      openMemberDetail(selectedMember);
      fetchMembers();
    } catch {
      setCommError("Network error. Please try again.");
    } finally {
      setCommAdding(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    try {
      const res = await fetch("/api/founder/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "An unexpected error occurred");
        return;
      }
      setInviteSuccess({
        name: inviteForm.name,
        email: inviteForm.email,
        refCode: data.member.refCode,
      });
      setInviteForm({ name: "", email: "", phone: "", commissionRate: "" });
      fetchMembers();
    } catch {
      setInviteError("Failed to create member");
    } finally {
      setInviting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingMembers = members.filter((m) => !m.isApproved);
  const approvedMembers = members.filter((m) => m.isApproved);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Founder Dashboard</h1>
            <p className="text-sm text-gray-500">ShopIQ Sales Management</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(membersError || clientsError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-red-600">
              {membersError && <p>{membersError}</p>}
              {clientsError && <p>{clientsError}</p>}
            </div>
            <button onClick={() => { setMembersError(""); setClientsError(""); fetchMembers(); fetchAllClients(); }} className="text-sm text-red-600 underline hover:text-red-800 cursor-pointer">Retry</button>
          </div>
        )}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-600">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">&times;</button>
          </div>
        )}
        {/* Tabs + Add Member */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1 w-fit">
            {(["team", "clients"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelectedMember(null);
                }}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  tab === t
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t === "team" ? "Sales Team" : "All Clients"}
              </button>
            ))}
          </div>
          <button
            ref={inviteButtonRef}
            onClick={() => { setShowInviteModal(true); setInviteSuccess(null); setInviteError(""); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            + Add Sales Member
          </button>
        </div>

        {/* TEAM TAB */}
        {tab === "team" && !selectedMember && (
          <div className="space-y-6">
            {/* Pending Members */}
            {pendingMembers.length > 0 && (
              <div className="bg-white border border-yellow-200 rounded-xl shadow-sm">
                <div className="p-5 border-b border-yellow-100">
                  <h2 className="text-lg font-semibold text-yellow-700">
                    Pending Approval ({pendingMembers.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-5"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        <p className="text-sm text-gray-500">{m.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Applied{" "}
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(m.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(m.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Members */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Members ({approvedMembers.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left px-5 py-3 font-medium">Name</th>
                      <th className="text-left px-5 py-3 font-medium">Email</th>
                      <th className="text-left px-5 py-3 font-medium">Clients</th>
                      <th className="text-left px-5 py-3 font-medium">Commission</th>
                      <th className="text-left px-5 py-3 font-medium">Joined</th>
                      <th className="text-right px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                          No approved members yet.
                        </td>
                      </tr>
                    ) : (
                      approvedMembers.map((m) => (
                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{m.name}</td>
                          <td className="px-5 py-3 text-gray-600">{m.email}</td>
                          <td className="px-5 py-3 text-gray-900">{m.clientCount}</td>
                          <td className="px-5 py-3 text-green-600 font-medium">${m.totalCommission.toFixed(2)}</td>
                          <td className="px-5 py-3 text-gray-500">{formatDate(m.createdAt)}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => openMemberDetail(m)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MEMBER DETAIL VIEW */}
        {tab === "team" && selectedMember && (() => {
          const getMonthKey = (dateStr: string) => {
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          };
          const formatMonth = (key: string) => {
            const [y, m] = key.split("-").map(Number);
            return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
          };

          // Available months from commissions + clients
          const monthSet = new Set<string>();
          monthSet.add(commMonthFilter);
          for (const c of memberCommissions) {
            monthSet.add(getMonthKey(c.createdAt));
          }
          for (const c of memberClients) {
            monthSet.add(getMonthKey(c.createdAt));
          }
          const availableMonths = Array.from(monthSet).sort().reverse();

          // Filtered commissions
          const filteredComm = memberCommissions.filter(
            (c) => getMonthKey(c.createdAt) === commMonthFilter
          );
          const filteredCommTotal = filteredComm.reduce(
            (sum, c) => sum + Number(c.amount), 0
          );

          // Daily conversions for selected month
          const [cy, cm] = commMonthFilter.split("-").map(Number);
          const daysInMonth = new Date(cy, cm, 0).getDate();
          const dailyCounts: number[] = new Array(daysInMonth).fill(0);
          for (const c of memberClients) {
            if (c.status === "CONVERTED" && getMonthKey(c.createdAt) === commMonthFilter) {
              const day = new Date(c.createdAt).getDate();
              dailyCounts[day - 1]++;
            }
          }
          const now = new Date();
          const isCurrentMonth = getMonthKey(now.toISOString()) === commMonthFilter;
          const today = isCurrentMonth ? now.getDate() : daysInMonth;
          const dailyCumulative: number[] = [];
          let runningTotal = 0;
          for (let i = 0; i < daysInMonth; i++) {
            if (i < today) {
              runningTotal += dailyCounts[i];
              dailyCumulative.push(runningTotal);
            } else {
              dailyCumulative.push(-1);
            }
          }
          const maxDailyConv = Math.max(1, ...dailyCumulative.filter((v) => v >= 0));

          return (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedMember(null)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                &larr; Back to Team
              </button>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedMember.name}</h2>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                  <select
                    value={commMonthFilter}
                    onChange={(e) => setCommMonthFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{formatMonth(m)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Total Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedMember.clientCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Commission ({formatMonth(commMonthFilter).split(" ")[0]})</p>
                    <p className="text-2xl font-bold text-green-600">${filteredCommTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">All Time</p>
                    <p className="text-2xl font-bold text-blue-600">${selectedMember.totalCommission.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Daily Conversions Graph */}
              {dailyCumulative.some((v) => v > 0) && (() => {
                const totalSoFar = Math.max(0, ...dailyCumulative.filter((v) => v >= 0));
                return (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Conversions — {formatMonth(commMonthFilter)}</h3>
                      <span className="text-sm font-medium text-gray-700">{totalSoFar} total</span>
                    </div>
                    <div className="flex items-end gap-px h-32">
                      {dailyCumulative.map((count, i) => {
                        const isFuture = count === -1;
                        const hadSaleToday = dailyCounts[i] > 0;
                        const prevCum = i > 0 ? dailyCumulative[i - 1] : 0;
                        const hadPriorSales = prevCum > 0;
                        const barColor = isFuture ? "bg-gray-300"
                          : hadSaleToday ? "bg-green-400"
                          : hadPriorSales ? "bg-red-400"
                          : "bg-gray-200";
                        const displayCount = isFuture ? 0 : count;
                        const needsFullHeight = isFuture || (!hadSaleToday && !hadPriorSales) || (hadPriorSales && !hadSaleToday);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                            <div
                              className={`w-full rounded-t-sm transition-all ${barColor}`}
                              style={{ height: needsFullHeight ? "100%" : `${displayCount > 0 ? (displayCount / maxDailyConv) * 100 : 0}%`, minHeight: displayCount > 0 ? 4 : 4, opacity: isFuture ? 0.3 : needsFullHeight ? 0.5 : 1 }}
                            />
                            {!isFuture && (
                              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                Day {i + 1}: {dailyCounts[i]} sale{dailyCounts[i] !== 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">1</span>
                      <span className="text-[10px] text-gray-400">{daysInMonth}</span>
                    </div>
                  </div>
                );
              })()}

              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Member's Clients */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="p-5 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Clients ({memberClients.length})</h3>
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
                          </tr>
                        </thead>
                        <tbody>
                          {memberClients.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No clients yet.</td>
                            </tr>
                          ) : (
                            memberClients.map((c) => (
                              <tr key={c.id} className="border-b border-gray-100">
                                <td className="px-5 py-3 text-gray-900">{c.name}</td>
                                <td className="px-5 py-3 text-gray-600">{c.email}</td>
                                <td className="px-5 py-3 text-gray-600">{c.phone || "—"}</td>
                                <td className="px-5 py-3">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    c.status === "CONVERTED" ? "bg-green-100 text-green-700"
                                      : c.status === "CONTACTED" ? "bg-blue-100 text-blue-700"
                                      : c.status === "DECLINED" ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}>{c.status}</span>
                                </td>
                                <td className="px-5 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Commission */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Add Commission</h3>
                    {commError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{commError}</p>
                      </div>
                    )}
                    <form onSubmit={handleAddCommission} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Amount ($)"
                        value={commForm.amount}
                        onChange={(e) => setCommForm((p) => ({ ...p, amount: e.target.value }))}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        value={commForm.note}
                        onChange={(e) => setCommForm((p) => ({ ...p, note: e.target.value }))}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="submit"
                        disabled={commAdding}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {commAdding ? "Adding..." : "Add Commission"}
                      </button>
                    </form>
                  </div>

                  {/* Commission History */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Commission History</h3>
                      <span className="text-sm text-green-600 font-medium">
                        Total: ${filteredCommTotal.toFixed(2)}
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
                          {filteredComm.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-gray-400">No commissions this month.</td>
                            </tr>
                          ) : (
                            filteredComm.map((c) => (
                              <tr key={c.id} className="border-b border-gray-100">
                                <td className="px-5 py-3 text-green-600 font-medium">${Number(c.amount).toFixed(2)}</td>
                                <td className="px-5 py-3 text-gray-600">{c.note || "—"}</td>
                                <td className="px-5 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ALL CLIENTS TAB */}
        {tab === "clients" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Clients ({allClients.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                    <th className="text-left px-5 py-3 font-medium">Sales Member</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">No clients yet.</td>
                    </tr>
                  ) : (
                    allClients.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-900">{c.name}</td>
                        <td className="px-5 py-3 text-gray-600">{c.email}</td>
                        <td className="px-5 py-3 text-gray-600">{c.phone || "—"}</td>
                        <td className="px-5 py-3 text-blue-600 font-medium">{c.salesMember?.name || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.status === "CONVERTED" ? "bg-green-100 text-green-700"
                              : c.status === "CONTACTED" ? "bg-blue-100 text-blue-700"
                              : c.status === "DECLINED" ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>{c.status}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInviteModal(false);
              setInviteForm({ name: "", email: "", phone: "", commissionRate: "" });
              setInviteError("");
              inviteButtonRef.current?.focus();
            }
          }}
        >
          <div ref={inviteModalRef} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            {inviteSuccess ? (
              <div>
                <h2 id="invite-modal-title" className="text-lg font-semibold mb-4 text-green-600">Member Created</h2>
                <p className="text-sm text-gray-500 mb-4">A welcome email has been sent to the sales member with a link to set their password.</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="text-gray-500">Name:</span> <span className="text-gray-900">{inviteSuccess.name}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{inviteSuccess.email}</span></p>
                  <p><span className="text-gray-500">Ref Code:</span> <span className="text-gray-900 font-mono">{inviteSuccess.refCode}</span></p>
                </div>
                <button
                  onClick={() => { setShowInviteModal(false); setInviteSuccess(null); inviteButtonRef.current?.focus(); }}
                  className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 id="invite-modal-title" className="text-lg font-semibold text-gray-900 mb-4">Add Sales Member</h2>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={inviteForm.commissionRate}
                      onChange={(e) => setInviteForm((p) => ({ ...p, commissionRate: e.target.value }))}
                      placeholder="e.g. 10"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-600">{inviteError}</p>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowInviteModal(false); setInviteForm({ name: "", email: "", phone: "", commissionRate: "" }); setInviteError(""); inviteButtonRef.current?.focus(); }}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {inviting ? "Creating..." : "Create Member"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
