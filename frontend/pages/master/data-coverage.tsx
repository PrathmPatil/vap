import { useEffect } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import DataCoverageCalendar from "@/components/DataCoverageCalendar";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/context/AuthContext";
import { hasMasterAccess } from "@/lib/authRoles";

export default function MasterDataCoveragePage() {
  const router = useRouter();
  const { isAuthenticated, authLoading, role } = useAuth();
  const isMaster =
    role === "admin" || role === "master" || hasMasterAccess(role);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?from=/master/data-coverage");
      return;
    }
    if (!isMaster) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, isMaster, router]);

  if (authLoading) {
    return <PageLoader fullScreen message="Checking access…" />;
  }

  if (!isAuthenticated || !isMaster) {
    return <PageLoader fullScreen message="Redirecting…" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <DataCoverageCalendar />
        </div>
      </main>
    </div>
  );
}
