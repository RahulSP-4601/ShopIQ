import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { ReportsList } from "@/components/reports/ReportsList";

export const runtime = "nodejs";

export default async function ReportsPage() {
  const session = await getUserSession();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/chat" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/25">
                  S
                </div>
                <span className="text-lg font-bold text-slate-900">Frame</span>
              </a>
              <span className="text-slate-300">|</span>
              <h1 className="text-lg font-semibold text-slate-700">Reports</h1>
            </div>
            <a
              href="/chat"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Back to Chat
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <ReportsList storeName={session.name} />
      </main>
    </div>
  );
}
