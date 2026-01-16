import { redirect } from "next/navigation";
import { getStore } from "@/lib/auth/session";
import { SyncProgress } from "@/components/sync/SyncProgress";

export const runtime = "nodejs";

export default async function SyncPage() {
  const store = await getStore();

  if (!store) {
    redirect("/");
  }

  // If already synced, redirect to chat
  if (store.syncStatus === "COMPLETED") {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/25">
              S
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              ShopIQ
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Setting up your store
          </h1>
          <p className="text-slate-600">
            Connected to{" "}
            <span className="font-medium text-slate-900">{store.domain}</span>
          </p>
        </div>

        {/* Sync Progress */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
          <SyncProgress />
        </div>

        {/* Info */}
        <p className="text-center text-sm text-slate-500 mt-8">
          We&apos;re syncing your products, customers, and orders from the last
          90 days. You&apos;ll be able to ask questions about your store once
          this is complete.
        </p>
      </div>
    </div>
  );
}
