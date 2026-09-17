import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchBhavcopyForDate,
  fetchBhavcopyRange,
  formatBhavcopyFetchError,
} from "@/lib/bhavcopyManualFetch";

type RsQuarterRow = {
  quarter: string;
  label: string;
  trading_sessions_back: number;
  as_of_date: string | null;
  as_of_close: number | null;
  lookback_date: string | null;
  lookback_close: number | null;
  return_pct: number | null;
  lookback_available?: boolean;
};

export type RsLookbackSessionDates = {
  as_of?: string | null;
  q1_63_sessions?: string | null;
  q2_126_sessions?: string | null;
  q3_189_sessions?: string | null;
  q4_252_sessions?: string | null;
};

export type RsSessionTimelineRow = {
  sessions_back: number;
  date: string;
  pr_status?: "fetched" | "missing";
  market_status?: string;
};

export type RsLookbackCheck = {
  key: string;
  trading_sessions_back: number;
  expected_date: string | null;
  market_status: string;
  market_open?: boolean;
  pr_status: string;
  fetchable?: boolean;
  holiday_description?: string;
};

export type RsDataGaps = {
  missing_trading_dates?: string[];
  missing_trading_count?: number;
  fetch_range?: { start_date: string; end_date: string } | null;
  pr_sessions_loaded?: number;
  expected_sessions_available?: number;
};

export type RsRankConfirmation = {
  success: boolean;
  message?: string;
  trade_date?: string;
  security?: string;
  symbol?: string;
  rs_rank?: number | null;
  rs_score?: number | null;
  weighted_formula?: string;
  quarters?: RsQuarterRow[];
  dates_used?: string[];
  trading_sessions_loaded?: number;
  is_reference?: boolean;
  is_market_calendar?: boolean;
  reference_note?: string;
  reference_symbol?: string;
  reference_security?: string;
  lookback_session_dates?: RsLookbackSessionDates;
  lookback_checks?: RsLookbackCheck[];
  data_gaps?: RsDataGaps;
  session_timeline?: RsSessionTimelineRow[];
  has_full_lookback_history?: boolean;
  example_symbol?: string | null;
  example_security?: string | null;
  example_rs_rank?: number | null;
  example_rs_score?: number | null;
};

export type RsRunMeta = {
  trade_date?: string;
  regenerated?: boolean;
  stocks_ranked?: number;
  calculated?: boolean;
  source?: string;
  quarter_session_lookbacks?: Record<string, number>;
  min_sessions_required?: number;
};

function formatDate(dateStr?: string | null) {
  const raw = String(dateStr || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
  const [y, m, d] = raw.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    "en-IN",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `₹${Number(value).toFixed(2)}`;
}

function formatPct(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const num = Number(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

const LOOKBACK_LABELS: Record<string, string> = {
  as_of: "As-of (0 sessions)",
  q1_63_sessions: "63 sessions back (~3M)",
  q2_126_sessions: "126 sessions back (~6M)",
  q3_189_sessions: "189 sessions back (~9M)",
  q4_252_sessions: "252 sessions back (~12M)",
};

function prStatusLabel(status?: string) {
  if (status === "fetched") return { text: "Bhavcopy in PR", className: "text-emerald-700" };
  if (status === "missing") return { text: "Bhavcopy missing", className: "text-red-700" };
  return { text: "Unknown", className: "text-slate-500" };
}

function marketStatusLabel(check?: RsLookbackCheck) {
  if (!check) return null;
  if (check.market_status === "trading") {
    return <span className="text-emerald-700">Market open</span>;
  }
  if (check.market_status === "holiday") {
    return (
      <span className="text-amber-800" title={check.holiday_description}>
        Holiday{check.holiday_description ? `: ${check.holiday_description}` : ""}
      </span>
    );
  }
  if (check.market_status === "weekend") {
    return <span className="text-slate-500">Weekend</span>;
  }
  return <span className="text-slate-500">{check.market_status}</span>;
}

function LookbackDatesSummary({
  lookbacks,
  checks,
}: {
  lookbacks?: RsLookbackSessionDates | null;
  checks?: RsLookbackCheck[];
}) {
  if (!lookbacks && !checks?.length) return null;

  const checkByKey = new Map((checks || []).map((c) => [c.key, c]));

  const items = checks?.length
    ? checks
    : [
        { key: "as_of", expected_date: lookbacks?.as_of ?? null, pr_status: "", market_status: "trading" },
        { key: "q1_63_sessions", expected_date: lookbacks?.q1_63_sessions ?? null, pr_status: "", market_status: "trading" },
        { key: "q2_126_sessions", expected_date: lookbacks?.q2_126_sessions ?? null, pr_status: "", market_status: "trading" },
        { key: "q3_189_sessions", expected_date: lookbacks?.q3_189_sessions ?? null, pr_status: "", market_status: "trading" },
        { key: "q4_252_sessions", expected_date: lookbacks?.q4_252_sessions ?? null, pr_status: "", market_status: "trading" },
      ].map((row) => ({ ...row, trading_sessions_back: 0 } as RsLookbackCheck));

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900/80">
        NSE calendar dates for RS lookbacks
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => {
          const check = checkByKey.get(item.key) || item;
          const date = check.expected_date;
          const pr = prStatusLabel(check.pr_status);
          return (
            <div
              key={item.key}
              className="rounded-md bg-white px-2.5 py-2 ring-1 ring-amber-100"
            >
              <p className="text-[0.65rem] font-medium text-slate-500">
                {LOOKBACK_LABELS[item.key] || item.key}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {date ? formatDate(date) : "—"}
              </p>
              {date ? (
                <p className="text-[0.65rem] tabular-nums text-slate-500">{date}</p>
              ) : null}
              <p className="mt-1 text-[0.65rem]">{marketStatusLabel(check)}</p>
              {check.pr_status ? (
                <p className={`text-[0.65rem] font-medium ${pr.className}`}>{pr.text}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RsRankMissingFetchPanel({
  formulaDates,
  canFetchBhavcopy,
  onFetched,
}: {
  formulaDates?: RsRankConfirmation | null;
  canFetchBhavcopy?: boolean;
  onFetched?: () => void;
}) {
  const gaps = formulaDates?.data_gaps;
  const missing = gaps?.missing_trading_dates || [];
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [busyRange, setBusyRange] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runDate = useCallback(
    async (date: string) => {
      setBusyDate(date);
      setErrorMsg(null);
      setStatusMsg(`Starting bhavcopy fetch for ${date}…`);
      try {
        const result = await fetchBhavcopyForDate(date, false);
        setStatusMsg(
          `Fetch queued for ${date}. Refresh this page after the job completes.`
        );
        onFetched?.();
        void result;
      } catch (err) {
        setErrorMsg(formatBhavcopyFetchError(err).message);
        setStatusMsg(null);
      } finally {
        setBusyDate(null);
      }
    },
    [onFetched]
  );

  const runRange = useCallback(async () => {
    const range = gaps?.fetch_range;
    if (!range) return;
    setBusyRange(true);
    setErrorMsg(null);
    setStatusMsg(
      `Starting range fetch ${range.start_date} → ${range.end_date}…`
    );
    try {
      await fetchBhavcopyRange(range.start_date, range.end_date, false);
      setStatusMsg(
        `Range fetch queued. Refresh after jobs finish (Admin → Data Coverage for progress).`
      );
      onFetched?.();
    } catch (err) {
      setErrorMsg(formatBhavcopyFetchError(err).message);
      setStatusMsg(null);
    } finally {
      setBusyRange(false);
    }
  }, [gaps?.fetch_range, onFetched]);

  const fetchableLookbacks =
    formulaDates?.lookback_checks?.filter((c) => c.fetchable && c.expected_date) ||
    [];

  if (!missing.length && !fetchableLookbacks.length) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-red-900">Missing bhavcopy in RS window</p>
        <p className="mt-1 text-xs text-red-800/90">
          {gaps?.missing_trading_count ?? missing.length} NSE trading day(s) between
          as-of and 252 sessions back have no PR data.
          {gaps?.pr_sessions_loaded != null ? (
            <> Only {gaps.pr_sessions_loaded} session(s) loaded in PR for this window.</>
          ) : null}
        </p>
        {formulaDates?.message ? (
          <p className="mt-1 text-xs text-amber-900">{formulaDates.message}</p>
        ) : null}
      </div>

      {fetchableLookbacks.length ? (
        <div className="space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase text-slate-600">
            Key lookback dates — market open, data missing
          </p>
          <ul className="space-y-1 text-xs">
            {fetchableLookbacks.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-center gap-2 rounded bg-white px-2 py-1 ring-1 ring-red-100"
              >
                <span className="font-medium">{LOOKBACK_LABELS[row.key] || row.key}:</span>
                <span className="tabular-nums">{row.expected_date}</span>
                <span className="text-emerald-700">Market open</span>
                {canFetchBhavcopy ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={busyDate === row.expected_date || busyRange}
                    onClick={() => row.expected_date && runDate(row.expected_date)}
                  >
                    {busyDate === row.expected_date ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    Fetch
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canFetchBhavcopy && gaps?.fetch_range ? (
        <Button
          type="button"
          size="sm"
          disabled={busyRange || Boolean(busyDate)}
          onClick={() => void runRange()}
        >
          {busyRange ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Fetch all missing days ({gaps.missing_trading_count})
        </Button>
      ) : !canFetchBhavcopy && missing.length ? (
        <p className="text-xs text-slate-600">
          Master/admin access required to run bhavcopy fetch here. Open{" "}
          <Link href="/master/data-coverage" className="font-medium text-blue-700 underline">
            Admin → Data Coverage
          </Link>{" "}
          to fetch missing dates.
        </p>
      ) : null}

      {statusMsg ? <p className="text-xs text-emerald-800">{statusMsg}</p> : null}
      {errorMsg ? <p className="text-xs text-red-700">{errorMsg}</p> : null}

      {missing.length > 0 && missing.length <= 40 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-slate-700">
            All missing trading dates ({missing.length})
          </summary>
          <p className="mt-2 flex flex-wrap gap-1">
            {missing.map((d) => (
              <span key={d} className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200 tabular-nums">
                {d}
              </span>
            ))}
          </p>
        </details>
      ) : null}
    </div>
  );
}

function SessionTimelineList({
  timeline,
}: {
  timeline?: RsSessionTimelineRow[];
}) {
  if (!timeline?.length) return null;

  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-700">
        All NSE session dates used (0 → {timeline.length - 1} sessions back,{" "}
        {timeline.length} days)
      </summary>
      <div className="mt-2 max-h-48 overflow-y-auto">
        <table className="min-w-full text-left text-[0.65rem]">
          <thead className="sticky top-0 bg-slate-100 text-slate-500">
            <tr>
              <th className="px-2 py-1">Sessions back</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">PR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {[...timeline].reverse().map((row) => (
              <tr
                key={`${row.sessions_back}-${row.date}`}
                className={row.pr_status === "missing" ? "bg-red-50/80" : ""}
              >
                <td className="px-2 py-0.5 tabular-nums">{row.sessions_back}</td>
                <td className="px-2 py-0.5">
                  {formatDate(row.date)}
                  <span className="ml-1 text-slate-500">({row.date})</span>
                </td>
                <td className="px-2 py-0.5">
                  {row.pr_status === "fetched" ? (
                    <span className="text-emerald-700">OK</span>
                  ) : row.pr_status === "missing" ? (
                    <span className="text-red-700">Missing</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function QuarterDatesTable({
  confirmation,
  title,
}: {
  confirmation: RsRankConfirmation;
  title?: string;
}) {
  if (!confirmation.quarters?.length) return null;

  return (
    <div className="space-y-2">
      {title ? (
        <p className="text-sm font-medium text-slate-800">{title}</p>
      ) : null}
      {confirmation.dates_used?.length ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            All PR dates used in this calculation
          </p>
          <p className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-slate-800">
            {confirmation.dates_used.map((d) => (
              <span
                key={d}
                className="rounded bg-white px-2 py-0.5 ring-1 ring-slate-200 tabular-nums"
              >
                {formatDate(d)}
                <span className="ml-1 font-normal text-slate-500">({d})</span>
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Quarter</th>
              <th className="px-3 py-2">Sessions back</th>
              <th className="px-3 py-2">As-of date</th>
              <th className="px-3 py-2">As-of close</th>
              <th className="px-3 py-2">Lookback date</th>
              <th className="px-3 py-2">Lookback close</th>
              <th className="px-3 py-2">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {confirmation.quarters.map((row) => (
              <tr
                key={row.quarter}
                className={row.lookback_available === false ? "bg-amber-50/60" : ""}
              >
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2 tabular-nums">
                  {row.trading_sessions_back}
                </td>
                <td className="px-3 py-2">{formatDate(row.as_of_date)}</td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPrice(row.as_of_close)}
                </td>
                <td className="px-3 py-2">
                  {row.lookback_available === false ? (
                    <span className="text-amber-800">Missing session</span>
                  ) : (
                    formatDate(row.lookback_date)
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPrice(row.lookback_close)}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {formatPct(row.return_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Props = {
  runMeta?: RsRunMeta | null;
  confirmation?: RsRankConfirmation | null;
  formulaDates?: RsRankConfirmation | null;
  loading?: boolean;
  companyHint?: string;
  selectedSymbol?: string;
  canFetchBhavcopy?: boolean;
  onRefresh?: () => void;
};

export default function RsRankConfirmationPanel({
  runMeta,
  confirmation,
  formulaDates,
  loading,
  companyHint,
  selectedSymbol,
  canFetchBhavcopy = false,
  onRefresh,
}: Props) {
  const tradeDate =
    runMeta?.trade_date || confirmation?.trade_date || formulaDates?.trade_date;

  const showFormulaDates = Boolean(formulaDates?.quarters?.length);

  const showCompanyBlock =
    selectedSymbol &&
    confirmation &&
    confirmation !== formulaDates &&
    confirmation.quarters?.length;

  const showDefault =
    !selectedSymbol &&
    confirmation?.quarters?.length &&
    !showFormulaDates;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          RS Rank — dates &amp; data used
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Formula as-of date is one NSE session. Q1–Q4 use PR closes from that
          session and from 63 / 126 / 189 / 252 <strong>trading sessions</strong>{" "}
          earlier (per stock).
        </p>
      </div>

      {tradeDate ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-800">
            Formula as-of: {formatDate(tradeDate)}
            <span className="ml-1 font-normal text-slate-500">({tradeDate})</span>
          </span>
          {runMeta?.stocks_ranked != null ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Stocks ranked: {runMeta.stocks_ranked.toLocaleString()}
            </span>
          ) : null}
          {runMeta?.source ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Data: {runMeta.source}
              {runMeta.calculated ? " (recalculated)" : " (from DB)"}
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading session dates…</p>
      ) : (
        <>
          {formulaDates?.lookback_session_dates ? (
            <LookbackDatesSummary
              lookbacks={formulaDates.lookback_session_dates}
              checks={formulaDates.lookback_checks}
            />
          ) : null}

          <RsRankMissingFetchPanel
            formulaDates={formulaDates}
            canFetchBhavcopy={canFetchBhavcopy}
            onFetched={onRefresh}
          />

          {formulaDates?.session_timeline?.length ? (
            <SessionTimelineList timeline={formulaDates.session_timeline} />
          ) : null}

          {formulaDates?.reference_note ? (
            <p className="text-xs text-slate-600">{formulaDates.reference_note}</p>
          ) : null}

          {showFormulaDates ? (
            <QuarterDatesTable
              confirmation={formulaDates}
              title={
                formulaDates.example_symbol
                  ? `Example PR closes: ${formulaDates.example_symbol}${formulaDates.example_security ? ` (${formulaDates.example_security})` : ""}`
                  : "Q1–Q4 session dates (market calendar)"
              }
            />
          ) : formulaDates && !formulaDates.success && formulaDates.message ? (
            <p className="text-sm text-amber-800">{formulaDates.message}</p>
          ) : null}

          {showCompanyBlock || showDefault ? (
            <QuarterDatesTable
              confirmation={confirmation!}
              title={
                showCompanyBlock
                  ? `Selected: ${confirmation?.symbol || confirmation?.security}`
                  : undefined
              }
            />
          ) : null}

          {confirmation && !confirmation.success && confirmation.message ? (
            <p className="text-sm text-amber-800">{confirmation.message}</p>
          ) : null}

          {!showFormulaDates &&
          !showCompanyBlock &&
          !showDefault &&
          !confirmation?.quarters?.length ? (
            <p className="text-sm text-slate-600">
              {confirmation?.message ||
                formulaDates?.message ||
                companyHint ||
                "Select a company to see its session dates and closes."}
            </p>
          ) : null}

          {confirmation?.success || formulaDates?.success ? (
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              {(confirmation?.rs_rank ?? formulaDates?.rs_rank) != null ? (
                <span>
                  RS Rank: {confirmation?.rs_rank ?? formulaDates?.rs_rank}
                </span>
              ) : null}
              {(confirmation?.rs_score ?? formulaDates?.rs_score) != null ? (
                <span>
                  RS Score:{" "}
                  {Number(
                    confirmation?.rs_score ?? formulaDates?.rs_score
                  ).toFixed(2)}
                </span>
              ) : null}
              <span>Formula: (2×Q1 + Q2 + Q3 + Q4) / 5</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
