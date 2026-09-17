type RsQuarterRow = {
  quarter: string;
  label: string;
  trading_sessions_back: number;
  as_of_date: string | null;
  as_of_close: number | null;
  lookback_date: string | null;
  lookback_close: number | null;
  return_pct: number | null;
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

type Props = {
  runMeta?: RsRunMeta | null;
  confirmation?: RsRankConfirmation | null;
  loading?: boolean;
  companyHint?: string;
};

export default function RsRankConfirmationPanel({
  runMeta,
  confirmation,
  loading,
  companyHint,
}: Props) {
  const tradeDate = runMeta?.trade_date || confirmation?.trade_date;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          RS Rank — calculation confirmation
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Trading-session lookbacks (not calendar months). Returns use PR close
          from the as-of date vs the close {`{63, 126, 189, 252}`} sessions
          earlier for this stock.
        </p>
      </div>

      {tradeDate ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-800">
            As-of session: {formatDate(tradeDate)}
          </span>
          {runMeta?.stocks_ranked != null ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Stocks ranked: {runMeta.stocks_ranked.toLocaleString()}
            </span>
          ) : null}
          {runMeta?.source ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Data: {runMeta.source}
              {runMeta.calculated ? " (recalculated this run)" : " (from DB)"}
            </span>
          ) : null}
          {runMeta?.regenerated ? (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-900">
              Universe refreshed for this date
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading session dates…</p>
      ) : confirmation?.success && confirmation.quarters?.length ? (
        <>
          <div className="flex flex-wrap gap-3 text-sm text-slate-800">
            <span className="font-medium">
              {confirmation.symbol || confirmation.security}
            </span>
            {confirmation.rs_rank != null ? (
              <span>RS Rank: {confirmation.rs_rank}</span>
            ) : null}
            {confirmation.rs_score != null ? (
              <span>RS Score: {Number(confirmation.rs_score).toFixed(2)}</span>
            ) : null}
            {confirmation.weighted_formula ? (
              <span className="text-slate-600">
                Formula: {confirmation.weighted_formula}
              </span>
            ) : null}
          </div>

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
                  <tr key={row.quarter}>
                    <td className="px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.trading_sessions_back}
                    </td>
                    <td className="px-3 py-2">{formatDate(row.as_of_date)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatPrice(row.as_of_close)}
                    </td>
                    <td className="px-3 py-2">{formatDate(row.lookback_date)}</td>
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
        </>
      ) : (
        <p className="text-sm text-slate-600">
          {confirmation?.message ||
            companyHint ||
            "Pick a company from the dropdown to see exact session dates and closes used in Q1–Q4."}
        </p>
      )}
    </div>
  );
}
