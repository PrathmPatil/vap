import { useCallback, useEffect, useRef, useState } from "react";

export interface ManualJobEvent {
  type: string;
  timestamp: string;
  job_name?: string;
  job_group?: string;
  log_id?: number;
  phase?: string;
  status?: string;
  trade_date?: string;
  trigger_source?: string;
  attempt?: number;
  max_attempts?: number;
  formula_index?: number;
  formula_total?: number;
  duration_seconds?: number;
  message?: string;
  error?: string;
  additional_data?: Record<string, unknown>;
  [key: string]: unknown;
}

const MANUAL_JOB_NAMES = new Set([
  "bhavcopy_manual",
  "bhavcopy_manual_range",
  "formula_manual_range",
]);

function toWsUrl(pythonBase: string): string {
  const base = pythonBase.replace(/\/+$/, "");
  const wsBase = base.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
  return `${wsBase}/bhavcopy/manual-jobs/ws`;
}

/** Show all manual bhavcopy/formula job events; don't filter out by unrelated cron job_name. */
function matchesFilter(
  event: ManualJobEvent,
  jobName?: string | null,
  jobGroup?: string | null,
): boolean {
  if (event.type === "connected" || event.type === "pong") return true;

  const name = event.job_name || "";
  const group = event.job_group || "";
  const trigger = String(event.trigger_source || "");

  const isManualBhavcopy =
    MANUAL_JOB_NAMES.has(name) ||
    trigger.includes("manual") ||
    event.type.startsWith("formula_") ||
    event.type.startsWith("job_");

  // Always allow manual pipeline events in the Manual API panel
  if (isManualBhavcopy) return true;

  if (jobName && name && name !== jobName) return false;
  if (jobGroup && group && group !== jobGroup) return false;
  return true;
}

export function useManualJobSocket(
  pythonBase: string,
  jobName?: string | null,
  jobGroup?: string | null,
) {
  const [events, setEvents] = useState<ManualJobEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [wsUrl, setWsUrl] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!pythonBase) return;
    disposedRef.current = false;

    const url = toWsUrl(pythonBase);
    setWsUrl(url);

    const cleanupSocket = () => {
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.onopen = null;
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          wsRef.current.onmessage = null;
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };

    const connect = () => {
      if (disposedRef.current) return;
      cleanupSocket();

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        setConnected(false);
        setLastError(err instanceof Error ? err.message : "Failed to create WebSocket");
        reconnectRef.current = setTimeout(connect, 3000);
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => {
        if (disposedRef.current) return;
        setConnected(true);
        setLastError(null);
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
      };

      ws.onclose = (ev) => {
        setConnected(false);
        if (pingRef.current) {
          clearInterval(pingRef.current);
          pingRef.current = null;
        }
        if (!disposedRef.current) {
          setLastError(
            ev.code === 1006
              ? "WebSocket closed abnormally (server missing websockets lib or proxy)"
              : `WebSocket closed (code ${ev.code})`,
          );
          reconnectRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        setConnected(false);
        setLastError(`WebSocket error connecting to ${url}`);
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as ManualJobEvent;
          if (data.type === "pong") return;
          if (!matchesFilter(data, jobName, jobGroup)) return;
          setEvents((prev) => [data, ...prev].slice(0, 150));
        } catch {
          // ignore malformed frames
        }
      };
    };

    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      cleanupSocket();
    };
  }, [pythonBase, jobName, jobGroup]);

  const clear = useCallback(() => setEvents([]), []);

  const pushLocalEvent = useCallback((event: Partial<ManualJobEvent> & { type: string }) => {
    const payload: ManualJobEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    setEvents((prev) => [payload, ...prev].slice(0, 150));
  }, []);

  return { events, connected, clear, wsUrl, lastError, pushLocalEvent };
}

export function formatManualJobEvent(event: ManualJobEvent): string {
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString()
    : "";

  switch (event.type) {
    case "connected":
      return `${time} Connected to live job feed`;
    case "job_queued":
      return `${time} Queued ${(event as { job_label?: string }).job_label || "background job"}`;
    case "api_started":
      return `${time} API started — ${event.message || event.job_name}`;
    case "api_ack":
      return `${time} ${event.message || "Background job acknowledged"}`;
    case "api_finished":
      return `${time} ${event.message || event.job_name}${event.status === "FAILED" ? " FAILED" : ""}`;
    case "job_started":
      return `${time} Started ${event.job_name} (log #${event.log_id})`;
    case "job_progress": {
      const phase = event.phase ? ` — ${event.phase}` : "";
      const date =
        (event.additional_data?.trade_date as string) ||
        (event.additional_data?.target_date as string) ||
        event.trade_date;
      const datePart = date ? ` [${date}]` : "";
      const formula =
        event.formula_index && event.formula_total
          ? ` (${event.formula_index}/${event.formula_total})`
          : "";
      return `${time} ${event.job_name}${phase}${datePart}${formula}`;
    }
    case "formula_started":
      return `${time} Formulas running for ${event.trade_date || "latest"} (attempt ${event.attempt}/${event.max_attempts})`;
    case "formula_completed":
      return `${time} Formulas done for ${event.trade_date || "latest"} (${event.duration_seconds ?? "?"}s)`;
    case "formula_failed":
      return `${time} Formula failed for ${event.trade_date || "latest"}: ${event.error || event.status || "error"}`;
    case "job_finished":
      return `${time} ${event.job_name} finished — ${event.status}${event.error ? `: ${event.error}` : ""}`;
    default:
      return `${time} ${event.type}${event.message ? `: ${event.message}` : ""}`;
  }
}
