import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-teal-100/40 to-emerald-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 to-indigo-100/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Frame"
            width={66}
            height={66}
            className="object-contain transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Frame
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-8">
        {children}
      </main>
    </div>
  );
}
