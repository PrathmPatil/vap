"use client";

import Navigation from "@/components/Navigation";
import NseCompanyDossier from "@/components/NseCompanyDossier";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/PageLoader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function NseDossierSymbolPage() {
  const router = useRouter();
  const symbol = typeof router.query.symbol === "string" ? router.query.symbol : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/nse-dossier">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All sources
            </Link>
          </Button>
          {symbol ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/company/${encodeURIComponent(symbol)}`}>Company page</Link>
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold text-slate-900">
            {symbol ? `${symbol} — all NSE information` : "NSE dossier"}
          </h1>
        </div>
        {!symbol ? (
          <PageLoader inline message="Loading symbol…" />
        ) : (
          <NseCompanyDossier symbol={symbol} full />
        )}
      </main>
    </div>
  );
}
