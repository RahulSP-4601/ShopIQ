"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component that checks if user is authenticated on the client side.
 * This prevents users from accessing protected pages via browser back button after logout.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        // Don't cache this request
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.replace("/signin");
      }
    } catch {
      setIsAuthenticated(false);
      router.replace("/signin");
    }
  }, [router]);

  useEffect(() => {
    checkAuth();

    // Also check auth when the page becomes visible (e.g., user comes back via back button)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Check auth on popstate (browser back/forward)
    const handlePopState = () => {
      checkAuth();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [checkAuth]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // If not authenticated, don't render children (router.replace will handle redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
