"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import WatchlistPage from "@/components/screener/WatchlistPage";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";

export default function Watchlist() {
  const router = useRouter();
  const { authLoading, isAuthenticated, isSubscribed } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent("/watchlist")}`);
      return;
    }
    if (!isSubscribed) {
      router.replace("/subscription");
    }
  }, [authLoading, isAuthenticated, isSubscribed, router]);

  if (authLoading || !isAuthenticated || !isSubscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <PageLoader inline message="Loading watchlist…" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Watchlist</h1>
          <p className="text-slate-600">
            Track your favorite stocks and monitor their latest prices
          </p>
        </div>
        <WatchlistPage />
      </main>
    </div>
  );
}
