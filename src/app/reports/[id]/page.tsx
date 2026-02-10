import { redirect, notFound } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { ReportView } from "@/components/reports/ReportView";

export const runtime = "nodejs";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const session = await getUserSession();

  if (!session?.userId) {
    redirect("/");
  }

  const { id } = await params;

  const report = await prisma.report.findFirst({
    where: { id, userId: session.userId },
  });

  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/chat" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/25">
                  S
                </div>
                <span className="text-lg font-bold text-slate-900">Frame</span>
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="/reports"
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Reports
              </a>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-medium text-slate-700">
                {report.title}
              </span>
            </div>
            <a
              href="/reports"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Reports
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <ReportView report={report} />
      </main>
    </div>
  );
}
