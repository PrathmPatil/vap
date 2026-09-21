import {
  getCoverageDateDetail,
  getDataCoverageCalendar,
} from "@/utils";
import { getLogs } from "@/utils/apis";
import BhavcopyJobStatusPanel from "@/components/BhavcopyJobStatusPanel";
import {
  type BhavcopyApiResponse,
  checkPythonBhavcopyHealth,
  fetchBhavcopyForDate as fetchBhavcopyDateApi,
  fetchBhavcopyRange,
  formatBhavcopyFetchError,
  getManualJobWsPythonBase,
  getBackendVapBase,
} from "@/lib/bhavcopyManualFetch";
import { useManualJobSocket } from "@/hooks/useManualJobSocket";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export type CoverageDayStatus =
  | "fetched"
  | "holiday"
  | "missing"
  | "weekend"
  | "future";

export type CoverageDay = {
  date: string;
  status: CoverageDayStatus;
  holiday_description?: string;
  holiday_day?: string;
  holiday_segment?: string;
};

type CoverageResponse = {
  success: boolean;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  today: string;
  counts: {
    fetched: number;
    holiday: number;
    missing: number;
    weekend: number;
    future: number;
  };
  missing_dates: string[];
  days: CoverageDay[];
  message?: string;
};

type CronHistoryEntry = {
  id: number;
  job_name: string;
  job_group?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | string | null;
  status: string;
  records_processed?: number;
  records_inserted?: number;
  records_updated?: number;
  error_message?: string | null;
  additional_data?: Record<string, unknown> | null;
};

type DateDetailResponse = {
  success: boolean;
  date: string;
  status: CoverageDayStatus;
  pr_record_count: number;
  holiday_description?: string;
  holiday_day?: string;
  holiday_segment?: string;
  history: CronHistoryEntry[];
  message?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_DOT: Record<CoverageDayStatus, string> = {
  fetched: "bg-emerald-500 ring-emerald-200",
  holiday: "bg-amber-400 ring-amber-200",
  missing: "bg-red-500 ring-red-200",
  weekend: "bg-slate-200 ring-transparent",
  future: "bg-slate-100 ring-transparent",
};

function statusLabel(day: Pick<CoverageDay, "status" | "holiday_description">) {
  switch (day.status) {
    case "fetched":
      return "Bhavcopy fetched";
    case "holiday":
      return day.holiday_description || "Market holiday";
    case "missing":
      return "Trading day — data not fetched";
    case "weekend":
      return "Weekend";
    case "future":
      return "Future date";
    default:
      return day.status;
  }
}

function formatShortDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeVariant(
  status?: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status || "").toLowerCase();
  if (s === "success") return "default";
  if (s === "failed") return "destructive";
  if (s === "running") return "secondary";
  return "outline";
}

function canFetchBhavcopy(status: CoverageDayStatus) {
  return status === "missing" || status === "fetched";
}

export default function DataCoverageCalendar() {
  const now = new Date();
  const pythonBase = useMemo(() => getManualJobWsPythonBase(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CoverageDay | null>(null);
  const [dateDetail, setDateDetail] = useState<DateDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [fetchingDate, setFetchingDate] = useState<string | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [apiCalling, setApiCalling] = useState(false);
  const [apiResponse, setApiResponse] = useState<BhavcopyApiResponse | null>(null);
  const [cronLog, setCronLog] = useState<{
    id: number;
    job_name: string;
    status: string;
    start_time?: string;
    end_time?: string | null;
    duration_seconds?: number | string | null;
    error_message?: string | null;
    additional_data?: Record<string, unknown> | null;
  } | null>(null);
  const [pollingCron, setPollingCron] = useState(false);
  const [pythonHealth, setPythonHealth] = useState<string | null>(null);

  const {
    events: liveEvents,
    connected: wsConnected,
    clear: clearLiveEvents,
    wsUrl,
    lastError: wsError,
    pushLocalEvent,
  } = useManualJobSocket(pythonBase, null, null);

  const loadCalendar = useCallback(async (keepSelection = false) => {
    setLoading(true);
    setError(null);
    if (!keepSelection) {
      setSelected(null);
      setDateDetail(null);
    }
    try {
      const response = (await getDataCoverageCalendar(
        year,
        month
      )) as CoverageResponse;
      if (!response?.success) {
        throw new Error(response?.message || "Failed to load calendar");
      }
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const loadDateDetail = useCallback(async (date: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = (await getCoverageDateDetail(date)) as DateDetailResponse;
      if (!response?.success) {
        throw new Error(response?.message || "Failed to load date detail");
      }
      setDateDetail(response);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "Failed to load date detail"
      );
      setDateDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!selected?.date) {
      setDateDetail(null);
      return;
    }
    void loadDateDetail(selected.date);
  }, [selected?.date, loadDateDetail]);

  useEffect(() => {
    void checkPythonBhavcopyHealth().then((result) => {
      setPythonHealth(result.ok ? null : result.message);
    });
  }, [pythonBase]);

  useEffect(() => {
    const trackJobName = apiResponse?.trackJobName;
    if (!trackJobName || !apiResponse?.success) {
      setPollingCron(false);
      return;
    }

    let cancelled = false;
    setPollingCron(true);

    const poll = async () => {
      try {
        const response = await getLogs(1, 1, undefined, {
          job_name: trackJobName,
          lightweight: true,
        });
        if (cancelled || !response?.success) return;

        const latest = response.data?.[0];
        if (!latest) return;

        setCronLog(latest);

        const status = String(latest.status || "").toUpperCase();
        if (status === "SUCCESS" || status === "FAILED") {
          setPollingCron(false);
          pushLocalEvent({
            type: "job_finished",
            job_name: latest.job_name,
            status,
            message: `Cron log #${latest.id} ${status}`,
          });
          await loadCalendar(true);
          if (selected?.date) {
            await loadDateDetail(selected.date);
          }
        }
      } catch {
        // keep polling while job may still be running
      }
    };

    void poll();
    const intervalId = window.setInterval(() => void poll(), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    apiResponse?.success,
    apiResponse?.trackJobName,
    loadCalendar,
    loadDateDetail,
    pushLocalEvent,
    selected?.date,
  ]);

  useEffect(() => {
    const last = liveEvents[0];
    if (!last || last.type !== "job_finished") return;
    if (String(last.status || "").toUpperCase() !== "SUCCESS") return;

    void loadCalendar(true).then(() => {
      if (selected?.date) {
        void loadDateDetail(selected.date);
      }
    });
  }, [liveEvents, loadCalendar, loadDateDetail, selected?.date]);

  const calendarCells = useMemo(() => {
    if (!data?.days?.length) return [];

    const firstDow = new Date(`${data.start_date}T00:00:00Z`).getUTCDay();
    const leading = Array.from({ length: firstDow }, (_, i) => ({
      key: `pad-start-${i}`,
      pad: true as const,
    }));

    const dayCells = data.days.map((day) => ({
      key: day.date,
      pad: false as const,
      day,
    }));

    const total = leading.length + dayCells.length;
    const trailingCount = total % 7 === 0 ? 0 : 7 - (total % 7);
    const trailing = Array.from({ length: trailingCount }, (_, i) => ({
      key: `pad-end-${i}`,
      pad: true as const,
    }));

    return [...leading, ...dayCells, ...trailing];
  }, [data]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  const selectDay = (day: CoverageDay) => {
    setSelected(day);
  };

  const clearJobStatus = () => {
    clearLiveEvents();
    setApiResponse(null);
    setCronLog(null);
    setPollingCron(false);
  };

  const runFetchForDate = async (date: string, forceRefresh = false) => {
    setFetchingDate(date);
    setApiCalling(true);
    clearJobStatus();

    pushLocalEvent({
      type: "api_started",
      message: `POST fetch-date-with-formulas ${date}`,
      job_name: "bhavcopy_manual",
      status: "RUNNING",
    });

    try {
      const result = await fetchBhavcopyDateApi(date, forceRefresh);
      setApiResponse(result);

      pushLocalEvent({
        type: "api_ack",
        message:
          typeof result.data === "object" &&
          result.data &&
          "message" in result.data &&
          typeof (result.data as { message?: string }).message === "string"
            ? (result.data as { message: string }).message
            : `Fetch started for ${date}`,
        job_name: result.trackJobName,
        status: "STARTED",
      });

      if (selected?.date !== date) {
        const dayFromCalendar = data?.days.find((d) => d.date === date);
        if (dayFromCalendar) setSelected(dayFromCalendar);
      }
    } catch (err) {
      const formatted = formatBhavcopyFetchError(err, pythonBase);
      setApiResponse({
        success: false,
        kind: "single",
        label: `Fetch ${date}`,
        requestUrl: `${getBackendVapBase()}/manual/bhavcopy/fetch-date-with-formulas/${date}`,
        httpStatus: formatted.httpStatus,
        error: formatted.message,
        data: formatted.data,
      });
      pushLocalEvent({
        type: "api_finished",
        message: formatted.message,
        job_name: "bhavcopy_manual",
        status: "FAILED",
        error: formatted.message,
      });
    } finally {
      setFetchingDate(null);
      setApiCalling(false);
    }
  };

  const runFetchAllMissing = async () => {
    if (!data?.missing_dates?.length) return;
    const sorted = [...data.missing_dates].sort();
    const start_date = sorted[0];
    const end_date = sorted[sorted.length - 1];

    setFetchingAll(true);
    setApiCalling(true);
    clearJobStatus();

    pushLocalEvent({
      type: "api_started",
      message: `POST fetch-range-with-formulas ${start_date} → ${end_date}`,
      job_name: "bhavcopy_manual_range",
      status: "RUNNING",
    });

    try {
      const result = await fetchBhavcopyRange(start_date, end_date, false);
      setApiResponse(result);

      pushLocalEvent({
        type: "api_ack",
        message:
          (result.data as { message?: string })?.message ||
          `Range fetch started ${start_date} → ${end_date}`,
        job_name: result.trackJobName,
        status: "STARTED",
      });
    } catch (err) {
      const formatted = formatBhavcopyFetchError(err, pythonBase);
      setApiResponse({
        success: false,
        kind: "range",
        label: `Fetch range ${start_date} → ${end_date}`,
        requestUrl: `${getBackendVapBase()}/manual/bhavcopy/fetch-range-with-formulas?start_date=${start_date}&end_date=${end_date}&force_refresh=false&background=true`,
        httpStatus: formatted.httpStatus,
        error: formatted.message,
        data: formatted.data,
      });
      pushLocalEvent({
        type: "api_finished",
        message: formatted.message,
        job_name: "bhavcopy_manual_range",
        status: "FAILED",
        error: formatted.message,
      });
    } finally {
      setFetchingAll(false);
      setApiCalling(false);
    }
  };

  const selectedStatus = dateDetail?.status || selected?.status;
  const showFetchAction = selectedStatus && canFetchBhavcopy(selectedStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Bhavcopy Data Coverage
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            NSE trading days — see which dates have PR bhavcopy loaded vs missing.
            Click a date for history; fetch missing days directly from here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadCalendar(!!selected)}
            aria-label="Refresh calendar"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-slate-900">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ring-2 ${STATUS_DOT.fetched}`} />
          Fetched
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ring-2 ${STATUS_DOT.holiday}`} />
          Holiday
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ring-2 ${STATUS_DOT.missing}`} />
          Not fetched
        </span>
        <span className="inline-flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT.weekend}`} />
          Weekend
        </span>
      </div>

      {pythonHealth ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pythonHealth} — fetch goes through backend at{" "}
          <code className="text-xs">{getBackendVapBase()}/manual/bhavcopy</code>
        </div>
      ) : null}

      <BhavcopyJobStatusPanel
        calling={apiCalling}
        apiResponse={apiResponse}
        liveEvents={liveEvents}
        wsConnected={wsConnected}
        wsUrl={wsUrl}
        wsError={wsError}
        cronLog={cronLog}
        pollingCron={pollingCron}
        onClear={clearJobStatus}
      />

      {loading ? (
        <Skeleton className="h-[320px] w-full rounded-xl" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {[
              { label: "Fetched", value: data.counts.fetched, tone: "text-emerald-700" },
              { label: "Holidays", value: data.counts.holiday, tone: "text-amber-700" },
              { label: "Missing", value: data.counts.missing, tone: "text-red-700" },
              { label: "Weekends", value: data.counts.weekend, tone: "text-slate-500" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center"
              >
                <p className={`text-xl font-bold tabular-nums ${item.tone}`}>
                  {item.value}
                </p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {WEEKDAYS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarCells.map((cell) => {
                if (cell.pad) {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[4.5rem] border-b border-r border-slate-100 bg-slate-50/40 last:border-r-0"
                    />
                  );
                }

                const day = cell.day;
                const dayNum = Number(day.date.slice(8, 10));
                const isToday = day.date === data.today;
                const isSelected = selected?.date === day.date;
                const showDot =
                  day.status === "fetched" ||
                  day.status === "holiday" ||
                  day.status === "missing";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`min-h-[4.5rem] border-b border-r border-slate-100 p-2 text-left transition last:border-r-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                      isSelected ? "bg-blue-50/80" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                          isToday
                            ? "bg-slate-900 text-white"
                            : "text-slate-800"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {showDot ? (
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ${STATUS_DOT[day.status]}`}
                          title={statusLabel(day)}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatShortDate(selected.date)}
                    <span className="ml-2 font-normal text-slate-500">
                      ({selected.date})
                    </span>
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-700">
                    {statusLabel(dateDetail || selected)}
                  </p>
                  {dateDetail ? (
                    <p className="mt-1 text-xs text-slate-500">
                      PR records:{" "}
                      <span className="font-semibold tabular-nums text-slate-800">
                        {dateDetail.pr_record_count.toLocaleString()}
                      </span>
                    </p>
                  ) : null}
                  {selected.holiday_segment || dateDetail?.holiday_segment ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Segment:{" "}
                      {dateDetail?.holiday_segment || selected.holiday_segment}
                    </p>
                  ) : null}
                </div>

                {showFetchAction ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!!fetchingDate || fetchingAll}
                      onClick={() => void runFetchForDate(selected.date)}
                    >
                      {fetchingDate === selected.date ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {selectedStatus === "missing"
                        ? "Fetch bhavcopy + formulas"
                        : "Re-fetch + run formulas"}
                    </Button>
                    {selectedStatus === "fetched" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!fetchingDate || fetchingAll}
                        onClick={() =>
                          void runFetchForDate(selected.date, true)
                        }
                      >
                        Force refresh
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Job history for this date
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cron and manual fetch/formula runs linked to this trade date.
                </p>

                {detailLoading ? (
                  <Skeleton className="mt-3 h-32 w-full rounded-lg" />
                ) : detailError ? (
                  <p className="mt-3 text-sm text-red-600">{detailError}</p>
                ) : dateDetail?.history?.length ? (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateDetail.history.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">
                              <div>{row.job_name}</div>
                              {row.job_group ? (
                                <div className="text-xs text-slate-500">
                                  {row.job_group}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(row.status)}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDateTime(row.start_time)}
                            </TableCell>
                            <TableCell className="tabular-nums text-xs">
                              {row.duration_seconds != null
                                ? `${Number(row.duration_seconds).toFixed(1)}s`
                                : "—"}
                            </TableCell>
                            <TableCell className="tabular-nums text-xs">
                              {row.records_inserted != null
                                ? `+${row.records_inserted}`
                                : "—"}
                            </TableCell>
                            <TableCell className="max-w-[14rem] truncate text-xs text-slate-600">
                              {row.error_message ||
                                (row.additional_data?.phase
                                  ? String(row.additional_data.phase)
                                  : row.additional_data?.target_date
                                    ? `target: ${row.additional_data.target_date}`
                                    : "—")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No cron or manual job history found for this date yet.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {data.missing_dates.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50/60 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-red-800">
                  Missing bhavcopy ({data.missing_dates.length})
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={fetchingAll || !!fetchingDate}
                  onClick={() => void runFetchAllMissing()}
                >
                  {fetchingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Fetch all missing this month
                </Button>
              </div>
              <p className="mt-2 flex flex-wrap gap-2">
                {data.missing_dates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      const day = data.days.find((d) => d.date === date);
                      if (day) selectDay(day);
                    }}
                    className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                  >
                    {date}
                  </button>
                ))}
              </p>
            </div>
          ) : (
            <p className="text-sm text-emerald-700">
              All past trading days in this month have bhavcopy data.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
