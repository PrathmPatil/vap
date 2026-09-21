import { useCallback, useEffect, useRef, useState } from "react";
import { getLogs } from "@/utils/apis";
import { getManualJobWsPythonBase } from "@/lib/bhavcopyManualFetch";
import {
  useManualJobSocket,
  type ManualJobEvent,
} from "@/hooks/useManualJobSocket";

export type BhavcopyJobPhase =
  | "idle"
  | "queued"
  | "fetching"
  | "saving"
  | "formulas"
  | "success"
  | "failed";

export type CronLogSnippet = {
  id: number;
  job_name: string;
  status: string;
  start_time?: string;
  end_time?: string | null;
  duration_seconds?: number | string | null;
  error_message?: string | null;
  additional_data?: Record<string, unknown> | null;
};

const PHASE_LABELS: Record<BhavcopyJobPhase, string> = {
  idle: "Idle",
  queued: "Job queued — waiting for Python…",
  fetching: "Fetching bhavcopy from NSE…",
  saving: "Saving session data into PR…",
  formulas: "Bhavcopy saved — running formula scans…",
  success: "Fetch complete. Loading formula results…",
  failed: "Fetch failed",
};

function phaseFromEvent(event?: ManualJobEvent | null): BhavcopyJobPhase | null {
  if (!event) return null;
  switch (event.type) {
    case "job_queued":
    case "api_ack":
    case "api_started":
      return "queued";
    case "job_started":
      return "fetching";
    case "job_progress": {
      const phase = String(event.phase || event.additional_data?.phase || "").toLowerCase();
      if (phase.includes("formula")) return "formulas";
      if (phase.includes("insert") || phase.includes("save") || phase.includes("db")) {
        return "saving";
      }
      return "fetching";
    }
    case "formula_started":
      return "formulas";
    case "formula_completed":
    case "job_finished": {
      const status = String(event.status || "").toUpperCase();
      if (status === "FAILED") return "failed";
      if (status === "SUCCESS") return "success";
      return "formulas";
    }
    case "formula_failed":
    case "api_finished":
      return String(event.status || "").toUpperCase() === "FAILED"
        ? "failed"
        : null;
    default:
      return null;
  }
}

function phaseFromCron(log?: CronLogSnippet | null): BhavcopyJobPhase | null {
  if (!log) return null;
  const status = String(log.status || "").toUpperCase();
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "failed";
  const extra = String(log.additional_data?.phase || "").toLowerCase();
  if (extra.includes("formula")) return "formulas";
  if (extra.includes("insert") || extra.includes("save")) return "saving";
  if (status === "RUNNING") return "fetching";
  return null;
}

export function useBhavcopyJobTracker(options?: {
  onSuccess?: () => void;
  onFailed?: (message: string) => void;
}) {
  const onSuccessRef = useRef(options?.onSuccess);
  const onFailedRef = useRef(options?.onFailed);
  onSuccessRef.current = options?.onSuccess;
  onFailedRef.current = options?.onFailed;

  const [jobName, setJobName] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [phase, setPhase] = useState<BhavcopyJobPhase>("idle");
  const [cronLog, setCronLog] = useState<CronLogSnippet | null>(null);
  const [polling, setPolling] = useState(false);
  const finishedRef = useRef(false);
  const begunAtRef = useRef<number>(0);

  const pythonBase = getManualJobWsPythonBase();
  const { events, connected, clear, lastError, pushLocalEvent, wsUrl } =
    useManualJobSocket(pythonBase, jobName, "bhavcopy");

  const active = phase !== "idle" && phase !== "success" && phase !== "failed";

  const reset = useCallback(() => {
    finishedRef.current = false;
    setJobName(null);
    setTargetDate(null);
    setPhase("idle");
    setCronLog(null);
    setPolling(false);
    clear();
  }, [clear]);

  const begin = useCallback(
    (track: { jobName?: string; targetDate?: string | null }) => {
      finishedRef.current = false;
      begunAtRef.current = Date.now() - 2000;
      setJobName(track.jobName || "bhavcopy_manual");
      setTargetDate(track.targetDate || null);
      setPhase("queued");
      setCronLog(null);
      setPolling(true);
      pushLocalEvent({
        type: "api_ack",
        job_name: track.jobName || "bhavcopy_manual",
        message: track.targetDate
          ? `Tracking fetch for ${track.targetDate}`
          : "Tracking background fetch",
        status: "STARTED",
      });
    },
    [pushLocalEvent]
  );

  useEffect(() => {
    const next = phaseFromEvent(events[0]);
    if (!next || !active) return;
    setPhase((prev) => {
      if (prev === "success" || prev === "failed") return prev;
      const order: BhavcopyJobPhase[] = [
        "queued",
        "fetching",
        "saving",
        "formulas",
        "success",
        "failed",
      ];
      if (order.indexOf(next) >= order.indexOf(prev) || next === "failed") {
        return next;
      }
      return prev;
    });
  }, [events, active]);

  useEffect(() => {
    if (!polling || !jobName) return;

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled || finishedRef.current) return;
      try {
        const response = await getLogs(1, 8, undefined, {
          job_name: jobName,
          lightweight: true,
        });
        if (cancelled || !response?.success) return;

        const rows: CronLogSnippet[] = response.data || [];
        const latest =
          rows.find((row) => {
            const extra = row.additional_data || {};
            const matchesDate =
              !targetDate ||
              extra.target_date === targetDate ||
              extra.trade_date === targetDate ||
              extra.date === targetDate;
            if (!matchesDate) return false;
            if (!row.start_time) return true;
            const started = new Date(row.start_time).getTime();
            return !Number.isFinite(started) || started >= begunAtRef.current;
          }) || null;

        if (!latest) return;
        setCronLog(latest);

        const fromCron = phaseFromCron(latest);
        if (fromCron) {
          setPhase((prev) =>
            prev === "success" || prev === "failed" ? prev : fromCron
          );
        }

        const status = String(latest.status || "").toUpperCase();
        if (status === "SUCCESS" || status === "FAILED") {
          setPolling(false);
        }
      } catch {
        // keep polling
      }

      if (Date.now() - startedAt > 12 * 60 * 1000) {
        setPolling(false);
        setPhase((prev) => (prev === "success" ? prev : "failed"));
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [polling, jobName, targetDate]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (phase !== "success" && phase !== "failed") return;
    finishedRef.current = true;
    setPolling(false);
    if (phase === "success") {
      onSuccessRef.current?.();
    } else {
      onFailedRef.current?.(cronLog?.error_message || "Bhavcopy job failed");
    }
  }, [phase, cronLog?.error_message]);

  return {
    begin,
    reset,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    active,
    polling,
    cronLog,
    events,
    wsConnected: connected,
    wsError: lastError,
    wsUrl,
    targetDate,
    jobName,
  };
}
