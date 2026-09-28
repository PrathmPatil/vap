import Navigation from "@/components/Navigation";
import { NseRouteCatalog } from "@/components/NseCompanyDossier";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

export default function NseDossierIndexPage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("RELIANCE");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = symbol.trim().toUpperCase();
    if (!next) return;
    router.push(`/nse-dossier/${encodeURIComponent(next)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">NSE company information</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter a listed NSE symbol to see quote, financial results, announcements, board
            meetings, corporate actions, shareholding, insider trades, and annual reports.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex max-w-md gap-2">
          <Input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="RELIANCE"
            aria-label="NSE symbol"
          />
          <Button type="submit">Open dossier</Button>
        </form>

        <NseRouteCatalog />
      </main>
    </div>
  );
}
