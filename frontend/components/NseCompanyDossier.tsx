import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getNseCompanyDossier, getNseRoutes } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export type DossierSource = {
  name?: string;
  category?: string;
  page?: string;
  endpoint?: string;
  usefulness?: string;
  ok?: boolean;
  record_count?: number;
  error?: string | null;
  records?: Record<string, unknown>[];
};

export type DossierPage = {
  id: string;
  url: string;
  kind: string;
  note?: string;
};

export type DossierResponse = {
  success?: boolean;
  symbol?: string;
  fetchedAt?: string;
  ok_count?: number;
  source_count?: number;
  message?: string;
  sources?: Record<string, DossierSource>;
  pages?: DossierPage[];
};

type RouteCatalog = {
  note?: string;
  pages?: DossierPage[];
  json_sources?: DossierSource[];
};

function flattenRow(row: unknown, prefix = ""): Record<string, unknown> {
  if (row == null || typeof row !== "object" || Array.isArray(row)) {
    return { [prefix || "value"]: row };
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenRow(value, next));
    } else if (Array.isArray(value)) {
      out[next] = JSON.stringify(value);
    } else {
      out[next] = value;
    }
  }
  return out;
}

function cell(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function SimpleTable({
  rows,
  full,
}: {
  rows: Record<string, unknown>[];
  full?: boolean;
}) {
  const flatRows = useMemo(() => rows.map((row) => flattenRow(row)), [rows]);
  const keys = useMemo(() => {
    const set = new Set<string>();
    const sample = full ? flatRows : flatRows.slice(0, 8);
    sample.forEach((row) => Object.keys(row || {}).forEach((key) => set.add(key)));
    const all = [...set];
    return full ? all : all.slice(0, 8);
  }, [flatRows, full]);

  if (!rows.length) {
    return <p className="text-xs text-slate-500">No rows from NSE for this source.</p>;
  }

  const visible = full ? flatRows : flatRows.slice(0, 12);

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50 text-[0.65rem] uppercase text-slate-500">
          <tr>
            {keys.map((key) => (
              <th key={key} className="whitespace-nowrap px-2 py-1.5 font-medium">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((row, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-slate-50/60">
              {keys.map((key) => (
                <td
                  key={key}
                  className={
                    full
                      ? "max-w-[420px] whitespace-pre-wrap break-words px-2 py-1.5 text-slate-800"
                      : "max-w-[220px] truncate px-2 py-1.5 text-slate-800"
                  }
                >
                  {cell(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!full && (flatRows.length > 12 || keys.length < Object.keys(flatRows[0] || {}).length) ? (
        <p className="px-2 py-1 text-[0.65rem] text-slate-500">
          Preview only — open the full dossier page for every column and row.
        </p>
      ) : null}
    </div>
  );
}

function SourceCard({
  source,
  full,
}: {
  source: DossierSource;
  full?: boolean;
}) {
  return (
    <article className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold capitalize text-slate-900">
          {(source.name || "").replace(/_/g, " ")}
        </h3>
        <Badge variant={source.ok ? "default" : "destructive"}>
          {source.ok ? `${source.record_count ?? 0} rows` : "failed"}
        </Badge>
        {source.category ? (
          <span className="text-[0.65rem] uppercase text-slate-500">{source.category}</span>
        ) : null}
      </div>
      {source.usefulness ? (
        <p className="text-[0.7rem] text-slate-500">{source.usefulness}</p>
      ) : null}
      {source.endpoint ? (
        <p className="break-all font-mono text-[0.65rem] text-slate-400">{source.endpoint}</p>
      ) : null}
      {source.error && !source.ok ? (
        <p className="text-xs text-red-700">{source.error}</p>
      ) : (
        <SimpleTable rows={(source.records || []) as Record<string, unknown>[]} full={full} />
      )}
      {source.page ? (
        <a
          href={source.page}
          target="_blank"
          rel="noreferrer"
          className="text-[0.65rem] text-blue-700 underline"
        >
          NSE page
        </a>
      ) : null}
    </article>
  );
}

function SymbolSearch({ defaultSymbol }: { defaultSymbol?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultSymbol || "");

  useEffect(() => {
    setValue(defaultSymbol || "");
  }, [defaultSymbol]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = value.trim().toUpperCase();
    if (!next) return;
    router.push(`/nse-dossier/${encodeURIComponent(next)}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value.toUpperCase())}
        placeholder="NSE symbol, e.g. RELIANCE"
        aria-label="NSE symbol"
      />
      <Button type="submit">Load</Button>
    </form>
  );
}

export function NseRouteCatalog() {
  const [catalog, setCatalog] = useState<RouteCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNseRoutes()
      .then((res) => setCatalog(res as RouteCatalog))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load NSE routes"),
      );
  }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!catalog) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading NSE source catalog…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {catalog.note ? <p className="text-sm text-slate-600">{catalog.note}</p> : null}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          NSE pages
        </h3>
        <ul className="space-y-2">
          {(catalog.pages || []).map((page) => (
            <li key={page.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
              <div className="font-medium text-slate-900">{page.id.replace(/_/g, " ")}</div>
              <p className="text-xs text-slate-500">{page.note}</p>
              <a
                href={page.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-blue-700 underline"
              >
                {page.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          JSON APIs pulled per company
        </h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {(catalog.json_sources || []).map((source) => (
            <li key={source.name} className="rounded border border-slate-200 bg-white p-3 text-sm">
              <div className="font-medium capitalize">{(source.name || "").replace(/_/g, " ")}</div>
              <p className="text-xs text-slate-500">{source.usefulness}</p>
              <p className="mt-1 break-all font-mono text-[0.65rem] text-slate-400">
                {source.endpoint}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function NseCompanyDossier({
  symbol,
  full = false,
}: {
  symbol: string;
  full?: boolean;
}) {
  const [data, setData] = useState<DossierResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getNseCompanyDossier(symbol)
      .then((res) => {
        if (cancelled) return;
        setData(res as DossierResponse);
        if (res && (res as DossierResponse).success === false) {
          setError(String((res as DossierResponse).message || "Failed to load NSE dossier"));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load NSE dossier");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const sources = Object.values(data?.sources || {});
  const grouped = useMemo(() => {
    const map = new Map<string, DossierSource[]>();
    sources.forEach((source) => {
      const key = source.category || "other";
      map.set(key, [...(map.get(key) || []), source]);
    });
    return [...map.entries()];
  }, [sources]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            NSE company dossier — {symbol}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Live pull from nseindia.com JSON APIs used by Corporate Filings (financials,
            announcements, board meetings, actions, shareholding). NSE Ltd IR
            (investor-relations/financials) is the exchange’s own filings, not all listed companies.
          </p>
        </div>
        {!full ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/nse-dossier/${encodeURIComponent(symbol)}`}>View all information</Link>
          </Button>
        ) : null}
      </div>

      {full ? <SymbolSearch defaultSymbol={symbol} /> : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Fetching NSE quote, filings, and events…
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {data?.ok_count != null ? (
        <p className="text-xs text-slate-500">
          {data.ok_count}/{data.source_count} NSE sources OK
          {data.fetchedAt ? ` · ${data.fetchedAt}` : ""}
        </p>
      ) : null}

      {full
        ? grouped.map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                {category}
              </h3>
              <div className="space-y-3">
                {items.map((source) => (
                  <SourceCard key={source.name} source={source} full />
                ))}
              </div>
            </div>
          ))
        : (
            <div className="grid gap-3 md:grid-cols-2">
              {sources.map((source) => (
                <SourceCard key={source.name} source={source} />
              ))}
            </div>
          )}

      {full && data?.pages?.length ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Related NSE pages
          </h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {data.pages.map((page) => (
              <li key={page.id} className="rounded border border-slate-100 p-2 text-xs">
                <div className="font-medium capitalize">{page.id.replace(/_/g, " ")}</div>
                <p className="text-slate-500">{page.note}</p>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-blue-700 underline"
                >
                  {page.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
