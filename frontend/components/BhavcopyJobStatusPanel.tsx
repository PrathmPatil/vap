import { formatManualJobEvent, ManualJobEvent } from "@/hooks/useManualJobSocket";
import type { BhavcopyApiResponse } from "@/lib/bhavcopyManualFetch";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type CronLogSnippet = {
  id: number;
  job_name: string;
  status: string;
  start_time?: string;
  end_time?: string | null;
  duration_seconds?: number | string | null;
  error_message?: string | null;
  additional_data?: Record<string, unknown> | null;
};

type BhavcopyJobStatusPanelProps = {
  calling: boolean;
  apiResponse: BhavcopyApiResponse | null;
  liveEvents: ManualJobEvent[];
  wsConnected: boolean;
  wsUrl?: string;
  wsError?: string | null;
  cronLog?: CronLogSnippet | null;
  pollingCron?: boolean;
  onClear: () => void;
};

function cronStatusVariant(
  status?: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status || "").toLowerCase();
  if (s === "success") return "default";
  if (s === "failed") return "destructive";
  if (s === "running") return "secondary";
  return "outline";
}

export default function BhavcopyJobStatusPanel({
  calling,
  apiResponse,
  liveEvents,
  wsConnected,
  wsUrl,
  wsError,
  cronLog,
  pollingCron,
  onClear,
}: BhavcopyJobStatusPanelProps) {
  const showPanel =
    calling ||
    apiResponse ||
    liveEvents.length > 0 ||
    cronLog ||
    pollingCron;

  if (!showPanel) return null;

  const apiOk = apiResponse?.success;
  const apiFailed = apiResponse && !apiResponse.success;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Fetch job status</h3>
          {calling ? (
            <Badge variant="secondary">Calling API…</Badge>
          ) : apiOk ? (
            <Badge className="bg-green-600">STARTED</Badge>
          ) : apiFailed ? (
            <Badge variant="destructive">API FAILED</Badge>
          ) : null}
          {wsConnected ? (
            <Badge className="bg-green-600">Live feed</Badge>
          ) : (
            <Badge variant="outline">Live feed offline</Badge>
          )}
          {pollingCron ? (
            <Badge variant="secondary">Polling cron logs…</Badge>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      {calling ? (
        <p className="text-sm text-slate-600">
          Sending request to Python bhavcopy service…
        </p>
      ) : null}

      {apiResponse ? (
        <div
          className={`rounded-md border p-3 ${
            apiResponse.success
              ? "border-green-200 bg-green-50/80"
              : "border-red-200 bg-red-50/80"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{apiResponse.label}</span>
            {apiResponse.httpStatus != null ? (
              <span className="text-slate-600">HTTP {apiResponse.httpStatus}</span>
            ) : null}
            {apiResponse.trackJobName ? (
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
                {apiResponse.trackJobName}
              </code>
            ) : null}
          </div>

          {apiResponse.error ? (
            <p className="mb-2 text-sm font-medium text-red-700">
              {apiResponse.error}
            </p>
          ) : null}

          <p className="mb-2 break-all font-mono text-[11px] text-slate-500">
            {apiResponse.requestUrl}
          </p>

          <pre className="max-h-48 overflow-auto rounded bg-white/90 p-2 text-xs text-slate-800">
            {JSON.stringify(apiResponse.data ?? null, null, 2)}
          </pre>
        </div>
      ) : null}

      {cronLog ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest cron log
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{cronLog.job_name}</span>
            <Badge variant={cronStatusVariant(cronLog.status)}>
              {cronLog.status}
            </Badge>
            {cronLog.duration_seconds != null ? (
              <span className="text-xs text-slate-500">
                {Number(cronLog.duration_seconds).toFixed(1)}s
              </span>
            ) : null}
          </div>
          {cronLog.error_message ? (
            <p className="mt-2 text-sm text-red-700">{cronLog.error_message}</p>
          ) : null}
          {cronLog.additional_data?.phase ? (
            <p className="mt-1 text-xs text-slate-600">
              Phase: {String(cronLog.additional_data.phase)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Live progress
          </p>
          <span className="text-xs text-slate-500">
            {wsConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {wsUrl ? (
          <p className="mb-2 break-all font-mono text-[11px] text-slate-400">
            {wsUrl}
          </p>
        ) : null}
        {wsError && !wsConnected ? (
          <p className="mb-2 text-xs text-red-600">{wsError}</p>
        ) : null}
        {liveEvents.length === 0 ? (
          <p className="text-xs text-slate-500">
            Waiting for WebSocket events… If the API returned STARTED, the job is
            running in the background — cron log status updates above.
          </p>
        ) : (
          <ul className="max-h-52 space-y-1 overflow-y-auto font-mono text-xs">
            {liveEvents.map((ev, idx) => (
              <li
                key={`${ev.timestamp}-${ev.type}-${idx}`}
                className={
                  ev.type === "job_finished" && ev.status === "FAILED"
                    ? "text-red-700"
                    : ev.type === "api_finished" && ev.status === "FAILED"
                      ? "text-red-700"
                      : ev.type === "job_finished" || ev.type === "formula_completed"
                        ? "text-green-700"
                        : "text-slate-700"
                }
              >
                {formatManualJobEvent(ev)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
