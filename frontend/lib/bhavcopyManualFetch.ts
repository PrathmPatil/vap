import { callApi } from "@/utils/apis";
import { getPythonBaseUrl } from "./pythonApi";

export type BhavcopyFetchKind = "single" | "range";

export type BhavcopyApiResponse = {
  success: boolean;
  httpStatus?: number;
  kind: BhavcopyFetchKind;
  label: string;
  requestUrl: string;
  error?: string;
  data?: unknown;
  trackJobName?: string;
  trackJobGroup?: string;
};

export function getBackendVapBase(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `${window.location.origin}/vap`;
    }
  }
  return "http://localhost:8000/vap";
}

export function formatBhavcopyFetchError(
  err: unknown,
  _pythonBase?: string
): { message: string; httpStatus?: number; data?: unknown } {
  const backendBase = getBackendVapBase();

  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      message?: string;
      response?: { status?: number; data?: unknown };
    };
    const data = axiosErr.response?.data as
      | { message?: string; detail?: unknown }
      | undefined;

    const detail = data?.detail;
    const message =
      data?.message ||
      (typeof detail === "string" && detail) ||
      (Array.isArray(detail) && detail.map(String).join("; ")) ||
      axiosErr.message ||
      "Fetch failed";

    if (axiosErr.response?.status === 502) {
      return {
        message: `${message} (via backend ${backendBase}/manual/bhavcopy — ensure Python service is running)`,
        httpStatus: axiosErr.response?.status,
        data,
      };
    }

    return {
      message: String(message),
      httpStatus: axiosErr.response?.status,
      data,
    };
  }

  return {
    message: err instanceof Error ? err.message : "Fetch failed",
  };
}

export async function fetchBhavcopyForDate(
  date: string,
  forceRefresh = false
): Promise<BhavcopyApiResponse> {
  const requestUrl = `${getBackendVapBase()}/manual/bhavcopy/fetch-date-with-formulas/${encodeURIComponent(date)}?force_refresh=${forceRefresh}&background=true`;

  const res = await callApi<Record<string, unknown>>({
    url: `manual/bhavcopy/fetch-date-with-formulas/${encodeURIComponent(date)}`,
    method: "POST",
    params: { force_refresh: forceRefresh, background: true },
  });

  if (res?.success === false) {
    throw Object.assign(new Error(String(res.message || "Fetch failed")), {
      response: { status: 502, data: res },
    });
  }

  const track = res?.track as { job_name?: string; job_group?: string } | undefined;

  return {
    success: true,
    httpStatus: 200,
    kind: "single",
    label: `Fetch ${date}`,
    requestUrl,
    data: res,
    trackJobName: track?.job_name || "bhavcopy_manual",
    trackJobGroup: track?.job_group || "bhavcopy",
  };
}

export async function fetchBhavcopyRange(
  startDate: string,
  endDate: string,
  forceRefresh = false
): Promise<BhavcopyApiResponse> {
  const requestUrl = `${getBackendVapBase()}/manual/bhavcopy/fetch-range-with-formulas?start_date=${startDate}&end_date=${endDate}&force_refresh=${forceRefresh}&background=true`;

  const res = await callApi<Record<string, unknown>>({
    url: "manual/bhavcopy/fetch-range-with-formulas",
    method: "POST",
    params: {
      start_date: startDate,
      end_date: endDate,
      force_refresh: forceRefresh,
      background: true,
    },
  });

  if (res?.success === false) {
    throw Object.assign(new Error(String(res.message || "Range fetch failed")), {
      response: { status: 502, data: res },
    });
  }

  const track = res?.track as { job_name?: string; job_group?: string } | undefined;

  return {
    success: true,
    httpStatus: 200,
    kind: "range",
    label: `Fetch range ${startDate} → ${endDate}`,
    requestUrl,
    data: res,
    trackJobName: track?.job_name || "bhavcopy_manual_range",
    trackJobGroup: track?.job_group || "bhavcopy",
  };
}

export async function checkPythonBhavcopyHealth(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const res = await callApi<{ success?: boolean; status?: string; message?: string; python_base?: string }>({
      url: "manual/bhavcopy/health",
      method: "GET",
    });
    if (res?.success !== false && res?.status === "healthy") {
      return { ok: true, message: "Bhavcopy service is online (via backend proxy)" };
    }
    return {
      ok: false,
      message: res?.message || "Bhavcopy health check failed",
    };
  } catch (err) {
    const formatted = formatBhavcopyFetchError(err);
    return {
      ok: false,
      message: formatted.message,
    };
  }
}

/** WebSocket URL for live manual job progress (still hits Python directly). */
export function getManualJobWsPythonBase(): string {
  return getPythonBaseUrl();
}
