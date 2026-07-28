import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  formatManualJobEvent,
  useManualJobSocket,
} from "@/hooks/useManualJobSocket";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type ManualHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ManualApiParam {
  name: string;
  type: "string" | "boolean" | "number";
  required?: boolean;
  description?: string;
  in?: "path" | "query" | "body";
  defaultValue?: string;
}

export interface ManualApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: ManualHttpMethod;
  description: string;
  host: "python" | "backend";
  parameters?: ManualApiParam[];
  /** Highlight primary recovery actions */
  primary?: boolean;
}

interface CronManualOpsPanelProps {
  jobName?: string | null;
  jobGroup?: string | null;
  pythonBase: string;
  backendBase: string;
  getAuthHeaders: () => Record<string, string>;
  onCompleted?: () => void | Promise<void>;
}

function buildCatalog(): ManualApiEndpoint[] {
  return [
    // —— Bhavcopy + formulas (primary recovery) ——
    {
      id: "bh-missing",
      name: "List Missing Bhavcopy Dates",
      path: "/bhavcopy/missing-dates",
      method: "GET",
      host: "python",
      description: "Show weekdays in a range that still need PR data",
      primary: true,
      parameters: [
        { name: "start_date", type: "string", required: true, in: "query", defaultValue: "2026-06-24", description: "YYYY-MM-DD" },
        { name: "end_date", type: "string", required: true, in: "query", defaultValue: "2026-07-24", description: "YYYY-MM-DD" },
      ],
    },
    {
      id: "bh-date-formulas",
      name: "Fetch Date + Run Formulas",
      path: "/bhavcopy/fetch-date-with-formulas/{date}",
      method: "POST",
      host: "python",
      description: "Fetch one trade day then run the full formula engine (cron pipeline)",
      primary: true,
      parameters: [
        { name: "date", type: "string", required: true, in: "path", defaultValue: "2026-07-01", description: "Trade date YYYY-MM-DD" },
        { name: "force_refresh", type: "boolean", required: false, in: "query", defaultValue: "false" },
      ],
    },
    {
      id: "bh-range-formulas",
      name: "Fetch Range + Run Formulas",
      path: "/bhavcopy/fetch-range-with-formulas",
      method: "POST",
      host: "python",
      description: "Backfill missing weekdays then run formulas for each success day",
      primary: true,
      parameters: [
        { name: "start_date", type: "string", required: true, in: "query", defaultValue: "2026-06-24" },
        { name: "end_date", type: "string", required: true, in: "query", defaultValue: "2026-07-24" },
        { name: "force_refresh", type: "boolean", required: false, in: "query", defaultValue: "false" },
      ],
    },
    {
      id: "bh-today",
      name: "Fetch Today / Latest Trade Day",
      path: "/bhavcopy/fetch-today",
      method: "GET",
      host: "python",
      description: "Fetch latest available PR zip (does not auto-run formulas)",
      parameters: [
        { name: "force_refresh", type: "boolean", required: false, in: "query", defaultValue: "false" },
      ],
    },
    {
      id: "bh-status",
      name: "Bhavcopy Status",
      path: "/bhavcopy/status",
      method: "GET",
      host: "python",
      description: "Check if PR data exists for a date",
      parameters: [
        { name: "date", type: "string", required: false, in: "query", description: "YYYY-MM-DD" },
      ],
    },
    {
      id: "bh-clear-stuck",
      name: "Clear Stuck RUNNING Logs",
      path: "/bhavcopy/clear-stuck-logs",
      method: "POST",
      host: "python",
      description: "Mark old RUNNING cron rows as FAILED (after crashes)",
      parameters: [
        { name: "older_than_minutes", type: "number", required: false, in: "query", defaultValue: "120" },
      ],
    },
    // —— Formula ——
    {
      id: "fm-range-only",
      name: "Run Formulas for Date Range (no re-fetch)",
      path: "/bhavcopy/run-formulas-for-range",
      method: "POST",
      host: "python",
      description:
        "Re-run formula engine for days that already have PR data (use after formula timeouts). Live WebSocket progress.",
      primary: true,
      parameters: [
        { name: "start_date", type: "string", required: true, in: "query", defaultValue: "2026-06-24" },
        { name: "end_date", type: "string", required: true, in: "query", defaultValue: "2026-07-24" },
      ],
    },
    {
      id: "fm-engine",
      name: "Run Formula Engine (one date)",
      path: "/bhavcopy/run-formulas-for-date/{date}",
      method: "POST",
      host: "python",
      description:
        "Run all formulas for one trade_date via FastAPI (background + WebSocket live progress)",
      primary: true,
      parameters: [
        {
          name: "date",
          type: "string",
          required: true,
          in: "path",
          defaultValue: "2026-07-20",
          description: "Trade date YYYY-MM-DD",
        },
      ],
    },
    {
      id: "fm-start-cron",
      name: "Start Formula Cron",
      path: "/vap/cron-management/start-formula-cron",
      method: "POST",
      host: "backend",
      description: "Start / re-register the nightly formula cron",
    },
    // —— IPO ——
    {
      id: "ipo-sync",
      name: "Sync IPO (NSE)",
      path: "/vap/sync/ipo",
      method: "POST",
      host: "backend",
      description: "Trigger NSE IPO sync via Python service",
    },
    {
      id: "ipo-fetch-nse",
      name: "Fetch NSE IPO (Python)",
      path: "/ipo-scraper/fetch/nse",
      method: "GET",
      host: "python",
      description: "Direct Python IPO scraper fetch",
    },
    // —— Indian market ——
    {
      id: "im-sync",
      name: "Sync Market Holidays",
      path: "/indian-market/sync-holidays",
      method: "POST",
      host: "python",
      description: "Refresh holiday calendar",
    },
    {
      id: "im-status",
      name: "Market Status",
      path: "/indian-market/status",
      method: "GET",
      host: "python",
      description: "Current open/closed / holiday status",
    },
    // —— News / BSE ——
    {
      id: "gov-all",
      name: "Fetch All Gov News",
      path: "/gov-news/fetch-all",
      method: "POST",
      host: "python",
      description: "Trigger government news fetch",
    },
    {
      id: "bse-ann",
      name: "BSE Announcements",
      path: "/bse/ann-subcategory",
      method: "GET",
      host: "python",
      description: "Fetch BSE announcement subcategory feed",
    },
    // —— Listed companies ——
    {
      id: "listed-sync",
      name: "Sync Listed Companies",
      path: "/yfinance/fetch-and-store-listed-companies",
      method: "POST",
      host: "python",
      description: "Refresh NSE equity list into DB",
    },
  ];
}

function matchesJob(endpoint: ManualApiEndpoint, jobName?: string | null, jobGroup?: string | null) {
  const name = (jobName || "").toLowerCase();
  const group = (jobGroup || "").toLowerCase();

  if (!name && !group) return true;

  if (name.includes("bhavcopy") || group === "bhavcopy") {
    return endpoint.id.startsWith("bh-") || endpoint.id.startsWith("fm-");
  }
  if (name.includes("formula") || group.includes("formula")) {
    return endpoint.id.startsWith("fm-") || endpoint.id.startsWith("bh-");
  }
  if (name.includes("ipo") || group.includes("ipo")) {
    return endpoint.id.startsWith("ipo-");
  }
  if (name.includes("holiday") || name.includes("market_status") || group === "indian_market") {
    return endpoint.id.startsWith("im-");
  }
  if (name.includes("gov") || name.includes("news")) {
    return endpoint.id.startsWith("gov-");
  }
  if (name.includes("bse")) {
    return endpoint.id.startsWith("bse-");
  }
  if (name.includes("listed")) {
    return endpoint.id.startsWith("listed-");
  }
  return true;
}

export default function CronManualOpsPanel({
  jobName,
  jobGroup,
  pythonBase,
  backendBase,
  getAuthHeaders,
  onCompleted,
}: CronManualOpsPanelProps) {
  const catalog = useMemo(() => buildCatalog(), []);
  const endpoints = useMemo(
    () => catalog.filter((e) => matchesJob(e, jobName, jobGroup)),
    [catalog, jobName, jobGroup],
  );

  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [response, setResponse] = useState<{
    id: string;
    success: boolean;
    status?: number;
    data?: unknown;
    error?: string;
  } | null>(null);

  const {
    events: liveEvents,
    connected: wsConnected,
    clear: clearLiveEvents,
    wsUrl,
    lastError,
    pushLocalEvent,
  } = useManualJobSocket(pythonBase, jobName, jobGroup);

  const lastHandledFinishRef = useRef<string | null>(null);

  useEffect(() => {
    const last = liveEvents[0];
    if (!last || last.type !== "job_finished" || last.status !== "SUCCESS") return;
    const key = `${last.timestamp}:${last.log_id ?? ""}:${last.job_name ?? ""}`;
    if (lastHandledFinishRef.current === key) return;
    lastHandledFinishRef.current = key;
    void onCompleted?.();
  }, [liveEvents, onCompleted]);

  useEffect(() => {
    const defaults: Record<string, Record<string, string>> = {};
    for (const ep of catalog) {
      defaults[ep.id] = {};
      for (const p of ep.parameters || []) {
        defaults[ep.id][p.name] = p.defaultValue ?? "";
      }
    }
    setParamValues(defaults);
  }, [catalog]);

  const setParam = (endpointId: string, name: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] || {}), [name]: value },
    }));
  };

  const runEndpoint = async (endpoint: ManualApiEndpoint) => {
    setLoadingId(endpoint.id);
    setResponse(null);

    const startedAt = Date.now();
    pushLocalEvent({
      type: "api_started",
      message: `${endpoint.method} ${endpoint.name}`,
      job_name: endpoint.id,
      status: "RUNNING",
    });

    try {
      const values = paramValues[endpoint.id] || {};
      let path = endpoint.path;
      const query: Record<string, string | boolean | number> = {};
      const body: Record<string, unknown> = {};

      for (const p of endpoint.parameters || []) {
        const raw = values[p.name];
        if ((raw === undefined || raw === "") && p.required) {
          throw new Error(`Missing required parameter: ${p.name}`);
        }
        if (raw === undefined || raw === "") continue;

        let typed: string | boolean | number = raw;
        if (p.type === "boolean") typed = raw === "true" || raw === "1";
        if (p.type === "number") typed = Number(raw);

        const loc = p.in || (path.includes(`{${p.name}}`) ? "path" : endpoint.method === "GET" ? "query" : "body");
        if (loc === "path") {
          path = path.replace(`{${p.name}}`, encodeURIComponent(String(raw)));
        } else if (loc === "query") {
          query[p.name] = typed;
        } else {
          body[p.name] = typed;
        }
      }

      // Long jobs return immediately; track via WebSocket + Cron Logs.
      const backgroundJobs = new Set([
        "bh-date-formulas",
        "bh-range-formulas",
        "fm-range-only",
        "fm-engine",
      ]);
      if (backgroundJobs.has(endpoint.id)) {
        query.background = true;
      }

      const base = endpoint.host === "python" ? pythonBase : backendBase;
      const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
      const headers = getAuthHeaders();

      if (!base || base.includes("localhost")) {
        console.warn(
          `[ManualOps] Calling ${endpoint.host} at ${url}. If this 404s in production, set NEXT_PUBLIC_PYTHON_API=https://your-domain/ml`
        );
      }

      let res;
      switch (endpoint.method) {
        case "GET":
          res = await axios.get(url, { params: query, headers, timeout: 900000 });
          break;
        case "POST":
          res = await axios.post(url, body, {
            params: query,
            headers,
            timeout: query.background ? 30000 : 900000,
          });
          break;
        case "PUT":
          res = await axios.put(url, body, { params: query, headers, timeout: 900000 });
          break;
        case "DELETE":
          res = await axios.delete(url, { params: query, headers, timeout: 900000 });
          break;
        default:
          throw new Error("Unsupported method");
      }

      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      const isBackground =
        backgroundJobs.has(endpoint.id) &&
        (res.data?.status === "STARTED" || query.background === true);

      pushLocalEvent({
        type: isBackground ? "api_ack" : "api_finished",
        message: isBackground
          ? `${endpoint.name} started — watch Live progress below`
          : `${endpoint.name} OK (${elapsedSec}s)`,
        job_name: endpoint.id,
        status: isBackground ? "STARTED" : "SUCCESS",
        duration_seconds: elapsedSec,
      });

      setResponse({
        id: endpoint.id,
        success: true,
        status: res.status,
        data: res.data,
      });
      await onCompleted?.();
    } catch (error: any) {
      pushLocalEvent({
        type: "api_finished",
        message: `${endpoint.name} failed: ${error.message}`,
        job_name: endpoint.id,
        status: "FAILED",
        error: error.message,
      });
      setResponse({
        id: endpoint.id,
        success: false,
        status: error.response?.status,
        error: error.message,
        data: error.response?.data,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const primary = endpoints.filter((e) => e.primary);
  const rest = endpoints.filter((e) => !e.primary);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Manual APIs for{" "}
          <strong>{jobName || "all jobs"}</strong>
          {jobGroup ? ` (${jobGroup})` : ""}. Heavy jobs (
          <strong>Fetch + Formulas</strong>, <strong>Run Formulas for Range</strong>) start in
          the background and return immediately — watch <strong>Live progress</strong> below
          for fetch/formula updates
          {wsConnected ? (
            <Badge className="ml-2 bg-green-600">Live</Badge>
          ) : (
            <Badge variant="outline" className="ml-2">
              Offline
            </Badge>
          )}
          . Cron Logs also keep history (
          <code className="mx-1">bhavcopy_manual</code>,{" "}
          <code className="mx-1">bhavcopy_manual_range</code>,{" "}
          <code className="mx-1">formula_manual_range</code>).
        </AlertDescription>
      </Alert>

      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Live progress</h3>
            {wsConnected ? (
              <Badge className="bg-green-600">Connected</Badge>
            ) : (
              <Badge variant="destructive">Disconnected</Badge>
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearLiveEvents}>
            Clear
          </Button>
        </div>
        {wsUrl && (
          <p className="mb-2 break-all font-mono text-[11px] text-slate-500">{wsUrl}</p>
        )}
        {lastError && !wsConnected && (
          <p className="mb-2 text-xs text-red-600">{lastError}</p>
        )}
        {liveEvents.length === 0 ? (
          <p className="text-xs text-slate-500">
            Waiting for events… Run a Fetch + Formulas job to see phases here.
          </p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto font-mono text-xs text-slate-700">
            {liveEvents.map((ev, i) => (
              <li
                key={`${ev.timestamp}-${ev.type}-${i}`}
                className={
                  ev.type === "job_finished" && ev.status === "FAILED"
                    ? "text-red-700"
                    : ev.type === "formula_failed"
                      ? "text-amber-700"
                      : ev.type === "job_finished" || ev.type === "formula_completed"
                        ? "text-green-700"
                        : undefined
                }
              >
                {formatManualJobEvent(ev)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {primary.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Recommended recovery
          </h3>
          {primary.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              values={paramValues[endpoint.id] || {}}
              loading={loadingId === endpoint.id}
              disabled={!!loadingId}
              onChange={(name, value) => setParam(endpoint.id, name, value)}
              onRun={() => runEndpoint(endpoint)}
            />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Other manual APIs
          </h3>
          <Accordion type="single" collapsible className="w-full">
            {rest.map((endpoint) => (
              <AccordionItem key={endpoint.id} value={endpoint.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2 text-left">
                    <Badge variant={endpoint.method === "GET" ? "default" : "secondary"}>
                      {endpoint.method}
                    </Badge>
                    <span className="font-medium">{endpoint.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <EndpointCard
                    endpoint={endpoint}
                    values={paramValues[endpoint.id] || {}}
                    loading={loadingId === endpoint.id}
                    disabled={!!loadingId}
                    onChange={(name, value) => setParam(endpoint.id, name, value)}
                    onRun={() => runEndpoint(endpoint)}
                    compact
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {response && (
        <div
          className={`rounded border p-3 ${
            response.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <Badge className={response.success ? "bg-green-600" : "bg-red-600"}>
              {response.success ? "OK" : "Failed"}
            </Badge>
            {response.status != null && <span className="text-sm">HTTP {response.status}</span>}
          </div>
          {response.error && <p className="mb-2 text-sm text-red-700">{response.error}</p>}
          <pre className="max-h-64 overflow-auto rounded bg-white/80 p-2 text-xs">
            {JSON.stringify(response.data ?? null, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function EndpointCard({
  endpoint,
  values,
  loading,
  disabled,
  onChange,
  onRun,
  compact,
}: {
  endpoint: ManualApiEndpoint;
  values: Record<string, string>;
  loading: boolean;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
  onRun: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "rounded-lg border bg-white p-4 space-y-3"}>
      {!compact && (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={endpoint.method === "GET" ? "default" : "secondary"}>
              {endpoint.method}
            </Badge>
            <span className="font-semibold">{endpoint.name}</span>
            <Badge variant="outline">{endpoint.host}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">{endpoint.description}</p>
          <p className="mt-1 font-mono text-xs text-gray-500">{endpoint.path}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            host: {endpoint.host}
          </p>
        </div>
      )}

      {(endpoint.parameters || []).map((param) => (
        <div key={param.name} className="space-y-1">
          <Label className="text-xs">
            {param.name}
            {param.required ? " *" : ""}
            <span className="ml-1 text-gray-400">
              ({param.in || "auto"} · {param.type})
            </span>
          </Label>
          {param.type === "boolean" ? (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={values[param.name] ?? "false"}
              onChange={(e) => onChange(param.name, e.target.value)}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          ) : (
            <Input
              value={values[param.name] ?? ""}
              placeholder={param.description || param.name}
              onChange={(e) => onChange(param.name, e.target.value)}
            />
          )}
        </div>
      ))}

      <Button onClick={onRun} disabled={disabled} size="sm">
        {loading ? "Running… (may take several minutes)" : `Run ${endpoint.name}`}
      </Button>
    </div>
  );
}
