"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

interface SyncEntity {
  entity: string;
  status: string;
  totalCount: number | null;
  syncedCount: number;
}

interface SyncStatus {
  status: "PENDING" | "SYNCING" | "COMPLETED" | "FAILED";
  lastSyncedAt: string | null;
  counts: {
    products: number;
    customers: number;
    orders: number;
  };
  progress: {
    products?: SyncEntity;
    customers?: SyncEntity;
    orders?: SyncEntity;
  };
}

export function SyncProgress() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);

      // Redirect to chat when complete
      if (data.status === "COMPLETED") {
        setTimeout(() => router.push("/chat"), 1500);
      }
    } catch {
      setError("Failed to fetch sync status");
    }
  }, [router]);

  const startSync = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start sync");
      setStarted(true);
    } catch {
      setError("Failed to start sync");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.status === "PENDING" && !started) {
      startSync();
    }
  }, [status, started, startSync]);

  useEffect(() => {
    if (status?.status === "SYNCING" || (started && status?.status === "PENDING")) {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [status?.status, started, fetchStatus]);

  if (error) {
    return (
      <div className="text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            startSync();
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center gap-3">
        <Spinner size="lg" className="text-emerald-600" />
        <span className="text-slate-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center">
        {status.status === "SYNCING" && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <Spinner size="lg" className="text-emerald-600" />
            <span className="text-lg font-medium text-slate-700">
              Syncing your store data...
            </span>
          </div>
        )}
        {status.status === "COMPLETED" && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg
              className="h-8 w-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-lg font-medium text-emerald-600">
              Sync complete! Redirecting...
            </span>
          </div>
        )}
        {status.status === "FAILED" && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-lg font-medium text-red-600">
              Sync failed. Please try again.
            </span>
          </div>
        )}
      </div>

      {/* Progress Items */}
      <div className="space-y-4">
        <ProgressItem
          label="Products"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          }
          progress={status.progress.products}
          count={status.counts.products}
        />
        <ProgressItem
          label="Customers"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          }
          progress={status.progress.customers}
          count={status.counts.customers}
        />
        <ProgressItem
          label="Orders"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          }
          progress={status.progress.orders}
          count={status.counts.orders}
        />
      </div>

      <p className="text-center text-sm text-slate-500">
        This usually takes 1-3 minutes depending on store size.
      </p>
    </div>
  );
}

function ProgressItem({
  label,
  icon,
  progress,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  progress?: SyncEntity;
  count: number;
}) {
  const isComplete = progress?.status === "completed";
  const isInProgress = progress?.status === "in_progress";
  const isFailed = progress?.status === "failed";
  const isPending = !progress || progress.status === "pending" || progress.status === "started";

  const percentage =
    progress?.totalCount && progress.syncedCount
      ? Math.round((progress.syncedCount / progress.totalCount) * 100)
      : 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Icon */}
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          isComplete
            ? "bg-emerald-100 text-emerald-600"
            : isInProgress
            ? "bg-blue-100 text-blue-600"
            : isFailed
            ? "bg-red-100 text-red-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {icon}
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-sm text-slate-500">
            {isComplete && (count > 0 ? `${count.toLocaleString()} synced` : "0 found")}
            {isInProgress &&
              (progress?.totalCount
                ? `${progress.syncedCount.toLocaleString()} / ${progress.totalCount.toLocaleString()}`
                : "Syncing...")}
            {isPending && "Waiting..."}
            {isFailed && "Failed"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? "bg-emerald-500"
                : isInProgress
                ? "bg-blue-500"
                : isFailed
                ? "bg-red-500"
                : "bg-slate-200"
            }`}
            style={{ width: isComplete ? "100%" : `${percentage}%` }}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {isComplete && (
          <svg
            className="h-6 w-6 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {isInProgress && <Spinner size="sm" className="text-blue-500" />}
        {isFailed && (
          <svg
            className="h-6 w-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
