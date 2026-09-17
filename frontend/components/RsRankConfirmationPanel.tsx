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

function LookbackDatesSummary({
  lookbacks,
}: {
  lookbacks?: RsLookbackSessionDates | null;
}) {
  if (!lookbacks) return null;

  const items: { key: string; label: string; date: string | null | undefined }[] =
    [
      { key: "as_of", label: "As-of (0 sessions)", date: lookbacks.as_of },
      {
        key: "q1",
        label: "63 sessions back (~3M)",
        date: lookbacks.q1_63_sessions,
      },
      {
        key: "q2",
        label: "126 sessions back (~6M)",
        date: lookbacks.q2_126_sessions,
      },
      {
        key: "q3",
        label: "189 sessions back (~9M)",
        date: lookbacks.q3_189_sessions,
      },
      {
        key: "q4",
        label: "252 sessions back (~12M)",
        date: lookbacks.q4_252_sessions,
      },
    ];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900/80">
        NSE calendar dates for RS lookbacks
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-md bg-white px-2.5 py-2 ring-1 ring-amber-100"
          >
            <p className="text-[0.65rem] font-medium text-slate-500">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {item.date ? formatDate(item.date) : "—"}
            </p>
            {item.date ? (
              <p className="text-[0.65rem] tabular-nums text-slate-500">
                {item.date}
              </p>
            ) : (
              <p className="text-[0.65rem] text-amber-800">Not in PR yet</p>
            )}
          </div>
        ))}
      </div>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {[...timeline].reverse().map((row) => (
              <tr key={`${row.sessions_back}-${row.date}`}>
                <td className="px-2 py-0.5 tabular-nums">{row.sessions_back}</td>
                <td className="px-2 py-0.5">
                  {formatDate(row.date)}
                  <span className="ml-1 text-slate-500">({row.date})</span>
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
};

export default function RsRankConfirmationPanel({
  runMeta,
  confirmation,
  formulaDates,
  loading,
  companyHint,
  selectedSymbol,
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
            />
          ) : null}

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
