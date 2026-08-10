import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { getLogs } from "@/utils/apis";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter, X, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/custom-pagination";
import Navigation from "@/components/Navigation";
import CronManualOpsPanel from "@/components/CronManualOpsPanel";
import { PageLoader } from "@/components/ui/PageLoader";
import { hasMasterAccess } from "@/lib/authRoles";

interface LogEntry {
  id: number;
  job_name: string;
  job_group: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status:
    | "SUCCESS"
    | "FAILED"
    | "RUNNING"
    | "SKIPPED"
    | "success"
    | "failed"
    | "running"
    | "skipped";
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  error_message: string;
  error_traceback: string;
  additional_data: any;
}

interface ApiEndpoint {
  name: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  body?: any;
}

interface LogsPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface StatusCounts {
  total: number;
  success: number;
  failed: number;
  running: number;
  skipped?: number;
}

const DEFAULT_PAGINATION: LogsPagination = {
  total: 0,
  page: 1,
  limit: 10,
  total_pages: 1,
};

const DEFAULT_STATUS_COUNTS: StatusCounts = {
  total: 0,
  success: 0,
  failed: 0,
  running: 0,
  skipped: 0,
};

const MasterIndex = () => {
  const router = useRouter();
  const { isAuthenticated, authLoading, role } = useAuth();
  const isMaster =
    role === "admin" || role === "master" || hasMasterAccess(role);

  useEffect(() => {
    // Wait until the client-side token check is done before deciding to redirect.
    // Without this, isAuthenticated is always false on first render (SSR flash)
    // and the user gets kicked to /login immediately.
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isMaster) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, isMaster, router]);

  const [logsData, setLogsData] = useState<LogEntry[]>([]);
  const [pagination, setPagination] =
    useState<LogsPagination>(DEFAULT_PAGINATION);

  const [statusCounts, setStatusCounts] = useState<StatusCounts>(
    DEFAULT_STATUS_COUNTS,
  );

  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [customApiPath, setCustomApiPath] = useState("");
  const [customApiMethod, setCustomApiMethod] = useState<"GET" | "POST">("GET");
  const [customApiBody, setCustomApiBody] = useState("");

  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [jobNameFilter, setJobNameFilter] = useState<string>("all");
  const [uniqueJobNames, setUniqueJobNames] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const totalPages = useMemo(() => {
    return (
      pagination.total_pages ||
      Math.ceil((pagination.total || 0) / (pagination.limit || 10)) ||
      1
    );
  }, [pagination.total_pages, pagination.total, pagination.limit]);

  // FastAPI: local = :8080; production = reverse-proxied at /ml.
  // If a production build still has localhost in env, override to same-origin /ml.
  const getPythonBaseUrl = () => {
    const fromEnv = (
      process.env.NEXT_PUBLIC_PYTHON_API_URL ||
      process.env.NEXT_PUBLIC_PYTHON_API ||
      ""
    )
      .trim()
      .replace(/\/+$/, "");

    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const pageIsLocal = host === "localhost" || host === "127.0.0.1";
      const envIsLocal = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);

      if (!pageIsLocal && envIsLocal) {
        return `${window.location.origin}/ml`;
      }
    }

    return fromEnv || "http://localhost:8080";
  };

  const getBackendBaseUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (apiUrl) {
      // NEXT_PUBLIC_API_URL is usually .../vap — strip trailing /vap for full paths
      return apiUrl.replace(/\/vap\/?$/, "").replace(/\/+$/, "");
    }
    const backend = process.env.NEXT_PUBLIC_BACKEND_API?.trim();
    if (backend) return backend.replace(/\/+$/, "");
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host !== "localhost" && host !== "127.0.0.1") {
        return `${window.location.origin}/api`;
      }
    }
    return "http://localhost:8000";
  };

  const PYTHON_API_BASE = getPythonBaseUrl();
  const BACKEND_API_BASE = getBackendBaseUrl();

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      window.localStorage.getItem("token")?.trim() ||
      (() => {
        const row = document.cookie
          .split("; ")
          .find((r) => r.startsWith("token="));
        return row ? row.slice("token=".length).trim() : "";
      })();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  /** Resolve master Quick Action paths to backend vs Python FastAPI hosts. */
  const resolveApiUrl = (path: string) => {
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (
      normalized.startsWith("/bhavcopy") ||
      normalized.startsWith("/docs") ||
      normalized.startsWith("/openapi")
    ) {
      return `${PYTHON_API_BASE}${normalized}`;
    }
    return `${BACKEND_API_BASE}${normalized}`;
  };

  const apiEndpoints: ApiEndpoint[] = [
    {
      name: "Run Formula Engine",
      path: "/vap/formula/run-formula-engine",
      method: "POST",
      description: "Manually trigger the main formula cron job",
    },
    {
      name: "Start Formula Cron",
      path: "/vap/cron-management/start-formula-cron",
      method: "POST",
      description: "Start / re-run the formula cron job",
    },
    {
      name: "Sync IPO (NSE)",
      path: "/vap/sync/ipo",
      method: "POST",
      description: "Trigger NSE IPO sync via Python service",
    },
  ];

  const bhavcopyEndpoints: ApiEndpoint[] = [
    {
      name: "Fetch Today Bhavcopy",
      path: "/bhavcopy/fetch-today",
      method: "GET",
      description: "Fetch latest trade-date PR bhavcopy (usually yesterday)",
      parameters: [
        {
          name: "force_refresh",
          type: "boolean",
          required: false,
          description: "Reprocess even if data already exists",
        },
      ],
    },
    {
      name: "Fetch Date Range",
      path: "/bhavcopy/fetch-range",
      method: "GET",
      description: "Backfill NSE PR bhavcopy between two dates",
      parameters: [
        {
          name: "start_date",
          type: "string",
          required: true,
          description: "Start date YYYY-MM-DD",
        },
        {
          name: "end_date",
          type: "string",
          required: true,
          description: "End date YYYY-MM-DD",
        },
        {
          name: "force_refresh",
          type: "boolean",
          required: false,
          description: "Force re-download / reprocess",
        },
      ],
    },
    {
      name: "Fetch Specific Date",
      path: "/bhavcopy/fetch-date/{date}",
      method: "GET",
      description: "Fetch bhavcopy for one trade date",
      parameters: [
        {
          name: "date",
          type: "string",
          required: true,
          description: "Date in path, YYYY-MM-DD",
        },
        {
          name: "force_refresh",
          type: "boolean",
          required: false,
          description: "Force reprocess",
        },
      ],
    },
    {
      name: "Bhavcopy Status",
      path: "/bhavcopy/status",
      method: "GET",
      description: "Check if PR data exists for a date",
      parameters: [
        {
          name: "date",
          type: "string",
          required: false,
          description: "YYYY-MM-DD (defaults to today)",
        },
      ],
    },
    {
      name: "Generate NSE Zip URL",
      path: "/bhavcopy/generate-url/{date}",
      method: "GET",
      description: "Build the official NSE PR zip URL for a date",
      parameters: [
        {
          name: "date",
          type: "string",
          required: true,
          description: "YYYY-MM-DD in path",
        },
      ],
    },
    {
      name: "Fetch From Manual URL",
      path: "/bhavcopy/fetch-from-url",
      method: "POST",
      description: "Download and store a PR zip from a direct NSE URL",
    },
    {
      name: "Bhavcopy Health",
      path: "/bhavcopy/health",
      method: "GET",
      description: "Health check for bhavcopy service",
    },
  ];

  const buildFilters = () => {
    const filters: any = {};

    if (statusFilter !== "all") {
      filters.status = statusFilter.toUpperCase();
    }

    if (jobNameFilter !== "all") {
      filters.job_name = jobNameFilter;
    }

    if (dateFilter) {
      filters.date = formatDate(dateFilter, "yyyy-MM-dd");
    }

    if (startDate) {
      filters.start_date = formatDate(startDate, "yyyy-MM-dd");
    }

    if (endDate) {
      filters.end_date = formatDate(endDate, "yyyy-MM-dd");
    }

    return filters;
  };

  // Fetch logs with filters
  const fetchLogsData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);

    try {
      const response = await getLogs(
        pagination.page,
        pagination.limit,
        searchTerm,
        buildFilters(),
      );

      if (response.success) {
        const nextPagination: LogsPagination = {
          total: response.pagination?.total || 0,
          page: response.pagination?.page || pagination.page,
          limit: response.pagination?.limit || pagination.limit,
          total_pages:
            response.pagination?.total_pages ||
            Math.ceil(
              (response.pagination?.total || 0) /
                (response.pagination?.limit || pagination.limit || 10),
            ) ||
            1,
        };

        const rows = (response.data || []) as LogEntry[];
        setLogsData(rows);
        setPagination((prev) => {
          if (
            prev.total === nextPagination.total &&
            prev.page === nextPagination.page &&
            prev.limit === nextPagination.limit &&
            prev.total_pages === nextPagination.total_pages
          ) {
            return prev;
          }
          return nextPagination;
        });
        setStatusCounts(response.statusCounts || DEFAULT_STATUS_COUNTS);

        // Keep modal details in sync when a RUNNING job updates
        setSelectedLog((prev) => {
          if (!prev?.id) return prev;
          const fresh = rows.find((r) => r.id === prev.id);
          return fresh || prev;
        });

        if (response.uniqueJobNames && response.uniqueJobNames.length > 0) {
          setUniqueJobNames(response.uniqueJobNames);
        } else if (rows.length > 0) {
          const names = [...new Set(rows.map((log) => log.job_name))];
          setUniqueJobNames(names);
        }
      } else {
        console.error("Failed to fetch logs:", response.message);
        if (!silent) {
          setLogsData([]);
          setPagination((prev) => ({
            ...prev,
            total: 0,
            total_pages: 1,
          }));
          setStatusCounts(DEFAULT_STATUS_COUNTS);
        }
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      if (!silent) {
        setLogsData([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          total_pages: 1,
        }));
        setStatusCounts(DEFAULT_STATUS_COUNTS);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    dateFilter,
    startDate,
    endDate,
    jobNameFilter,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter, dateFilter, startDate, endDate, jobNameFilter, searchTerm]);

  // Fetch logs when dependencies change
  useEffect(() => {
    void fetchLogsData();
  }, [fetchLogsData]);

  // While any job is RUNNING, silently refresh logs so phase / progress stay current
  const hasRunningJobs =
    (statusCounts.running || 0) > 0 ||
    selectedLog?.status?.toUpperCase() === "RUNNING";

  useEffect(() => {
    if (!hasRunningJobs) return;

    const id = window.setInterval(() => {
      void fetchLogsData({ silent: true });
    }, 5000);

    return () => window.clearInterval(id);
  }, [hasRunningJobs, fetchLogsData]);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setJobNameFilter("all");
    setSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setPagination((prev) => ({
      ...prev,
      page,
    }));
  };

  const handlePageSizeChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      limit: newLimit,
    }));
  };

  const runApi = async (endpoint: ApiEndpoint, customParams?: any) => {
    setApiLoading(true);
    setApiResponse(null);

    try {
      const url = resolveApiUrl(endpoint.path);
      const headers = getAuthHeaders();
      let response;

      switch (endpoint.method) {
        case "GET":
          response = await axios.get(url, { params: customParams, headers });
          break;
        case "POST":
          response = await axios.post(url, customParams || {}, { headers });
          break;
        case "PUT":
          response = await axios.put(url, customParams || {}, { headers });
          break;
        case "DELETE":
          response = await axios.delete(url, { headers });
          break;
        default:
          throw new Error("Unsupported API method");
      }

      setApiResponse({
        success: true,
        data: response?.data,
        status: response?.status,
        timestamp: new Date().toISOString(),
      });

      await fetchLogsData();
    } catch (error: any) {
      setApiResponse({
        success: false,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setApiLoading(false);
    }
  };

  const runCustomApi = async () => {
    if (!customApiPath) return;

    setApiLoading(true);
    setApiResponse(null);

    try {
      const url = resolveApiUrl(customApiPath);
      const headers = getAuthHeaders();
      let response;

      if (customApiMethod === "GET") {
        response = await axios.get(url, { headers });
      } else {
        const body = customApiBody ? JSON.parse(customApiBody) : {};
        response = await axios.post(url, body, { headers });
      }

      setApiResponse({
        success: true,
        data: response.data,
        status: response.status,
        timestamp: new Date().toISOString(),
      });

      await fetchLogsData();
    } catch (error: any) {
      setApiResponse({
        success: false,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setApiLoading(false);
    }
  };

  const handleViewDetails = (log: LogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
    setActiveTab("details");
    setApiResponse(null);
  };

  const openManualOps = (log?: LogEntry | null) => {
    setSelectedLog(log || null);
    setIsModalOpen(true);
    setActiveTab("api");
    setApiResponse(null);
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toUpperCase();

    switch (normalizedStatus) {
      case "SUCCESS":
        return <Badge className="bg-green-500">Success</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "RUNNING":
        return <Badge className="bg-yellow-500">Running</Badge>;
      case "SKIPPED":
        return <Badge className="bg-gray-500">Skipped</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const hasActiveFilters = () => {
    return (
      statusFilter !== "all" ||
      dateFilter !== undefined ||
      startDate !== undefined ||
      endDate !== undefined ||
      jobNameFilter !== "all" ||
      searchTerm !== ""
    );
  };

  if (authLoading) {
    return <PageLoader fullScreen message="Checking access…" />;
  }

  if (!isAuthenticated || !isMaster) {
    return <PageLoader fullScreen message="Redirecting…" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">
            Master Index - Cron Job Monitor
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={() => openManualOps(null)}>
              Manual APIs
            </Button>
            {jobNameFilter === "bhavcopy_daily" && (
              <Button
                variant="secondary"
                onClick={() =>
                  openManualOps({
                    id: 0,
                    job_name: "bhavcopy_daily",
                    job_group: "bhavcopy",
                    start_time: "",
                    end_time: "",
                    duration_seconds: 0,
                    status: "SUCCESS",
                    records_processed: 0,
                    records_inserted: 0,
                    records_updated: 0,
                    error_message: "",
                    error_traceback: "",
                    additional_data: null,
                  })
                }
              >
                Bhavcopy + Formulas
              </Button>
            )}
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 rounded-lg border bg-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5" />
              Filters
            </h3>

            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="mr-1 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Search Filter */}
            <div className="col-span-1">
              <Label className="mb-2 block">Search</Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />

                <Input
                  placeholder="Search by job name, group, or error..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="mb-2 block">Status</Label>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Name Filter */}
            <div>
              <Label className="mb-2 block">Job Name</Label>

              <Select value={jobNameFilter} onValueChange={setJobNameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>

                  {uniqueJobNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Single Date Filter */}
            <div>
              <Label className="mb-2 block">Specific Date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? formatDate(dateFilter) : "Pick a date"}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="mb-2 block">Date Range</Label>

              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate) : "Start"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate) : "End"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>

              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}

              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setStatusFilter("all")}
                  />
                </Badge>
              )}

              {jobNameFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Job: {jobNameFilter}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setJobNameFilter("all")}
                  />
                </Badge>
              )}

              {dateFilter && (
                <Badge variant="secondary" className="gap-1">
                  Date: {formatDate(dateFilter)}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setDateFilter(undefined)}
                  />
                </Badge>
              )}

              {startDate && (
                <Badge variant="secondary" className="gap-1">
                  From: {formatDate(startDate)}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setStartDate(undefined)}
                  />
                </Badge>
              )}

              {endDate && (
                <Badge variant="secondary" className="gap-1">
                  To: {formatDate(endDate)}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setEndDate(undefined)}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>

        {loading && (
          <PageLoader inline message="Loading logs…" />
        )}

        {/* Summary Cards */}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold">
                {statusCounts.total || pagination.total || 0}
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="text-sm text-green-600">Success</div>
              <div className="text-2xl font-bold text-green-700">
                {statusCounts.success || 0}
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-600">Failed</div>
              <div className="text-2xl font-bold text-red-700">
                {statusCounts.failed || 0}
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="text-sm text-yellow-600">Running</div>
              <div className="text-2xl font-bold text-yellow-700">
                {statusCounts.running || 0}
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="mb-6">
          <h2 className="mb-4 text-2xl font-semibold">Cron Job Logs</h2>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Job Group</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration (s)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records Processed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!loading && logsData?.length > 0 ? (
                  logsData.map((log: LogEntry, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{log.job_name}</TableCell>
                      <TableCell>{log.job_group || "-"}</TableCell>
                      <TableCell>{formatDate(log.start_time)}</TableCell>
                      <TableCell>
                        {log.end_time ? formatDate(log.end_time) : "-"}
                      </TableCell>
                      <TableCell>{log.duration_seconds ?? "-"}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.records_processed ?? 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="ml-2"
                          onClick={() => openManualOps(log)}
                        >
                          Manual APIs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center">
                      {loading
                        ? "Loading..."
                        : "No logs found matching the filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Custom Pagination */}
          {!loading && (
            <div className="mt-4 rounded-xl border bg-white px-4 py-2.5">
              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                totalRecords={pagination.total}
                onPageChange={handlePageChange}
                pageSize={pagination.limit}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </div>

        {/* Modal - Cron Job Details */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
              <DialogTitle>
                {selectedLog
                  ? `Cron Job Details: ${selectedLog.job_name}`
                  : "Manual Cron APIs"}
                {selectedLog?.status?.toUpperCase() === "FAILED" && (
                  <Badge className="ml-2 bg-red-500">Failed</Badge>
                )}
                {selectedLog?.status?.toUpperCase() === "RUNNING" && (
                  <Badge className="ml-2 bg-yellow-500">
                    Running — auto-refreshing every 5s
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" disabled={!selectedLog}>
                  Job Details
                </TabsTrigger>
                <TabsTrigger value="api">Manual APIs</TabsTrigger>
                <TabsTrigger value="swagger">Self Swagger</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {selectedLog && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Job Name</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.job_name}
                        </div>
                      </div>

                      <div>
                        <Label>Job Group</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.job_group || "-"}
                        </div>
                      </div>

                      <div>
                        <Label>Start Time</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {formatDate(selectedLog.start_time)}
                        </div>
                      </div>

                      <div>
                        <Label>End Time</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.end_time
                            ? formatDate(selectedLog.end_time)
                            : "-"}
                        </div>
                      </div>

                      <div>
                        <Label>Duration</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.duration_seconds ?? "-"} seconds
                        </div>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <div className="mt-1">
                          {getStatusBadge(selectedLog.status)}
                        </div>
                      </div>

                      <div>
                        <Label>Records Processed</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.records_processed ?? 0}
                        </div>
                      </div>

                      <div>
                        <Label>Records Inserted</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.records_inserted ?? 0}
                        </div>
                      </div>

                      <div>
                        <Label>Records Updated</Label>
                        <div className="mt-1 rounded bg-gray-50 p-2">
                          {selectedLog.records_updated ?? 0}
                        </div>
                      </div>
                    </div>

                    {selectedLog.error_message && (
                      <div>
                        <Label className="text-red-600">Error Message</Label>
                        <div className="mt-1 rounded border border-red-200 bg-red-50 p-3 text-red-800">
                          {selectedLog.error_message}
                        </div>
                      </div>
                    )}

                    {selectedLog.error_traceback && (
                      <div>
                        <Label className="text-red-600">Error Traceback</Label>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-sm text-gray-100">
                          {selectedLog.error_traceback}
                        </pre>
                      </div>
                    )}

                    {selectedLog.additional_data && (
                      <div>
                        <Label>Additional Data</Label>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-3 text-sm">
                          {JSON.stringify(selectedLog.additional_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="api" className="space-y-4">
                <CronManualOpsPanel
                  jobName={selectedLog?.job_name}
                  jobGroup={selectedLog?.job_group}
                  pythonBase={PYTHON_API_BASE}
                  backendBase={BACKEND_API_BASE}
                  getAuthHeaders={getAuthHeaders}
                  onCompleted={fetchLogsData}
                />
              </TabsContent>

              <TabsContent value="swagger" className="space-y-4">
                <div className="space-y-6">
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                    <h3 className="mb-2 text-lg font-semibold">
                      FastAPI Swagger (Bhavcopy)
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">
                      Open the live Python service docs and try Bhavcopy endpoints
                      directly. After a successful fetch, formula cron can run.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="default" size="sm">
                        <a
                          href={`${PYTHON_API_BASE}/docs#/Bhavcopy`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Swagger → Bhavcopy
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`${PYTHON_API_BASE}/docs`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Full FastAPI Docs
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`${PYTHON_API_BASE}/openapi.json`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          openapi.json
                        </a>
                      </Button>
                    </div>
                    <p className="mt-2 font-mono text-xs text-gray-500">
                      {PYTHON_API_BASE}/docs
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Bhavcopy FastAPI Endpoints
                    </h3>
                    <Accordion type="single" collapsible className="w-full">
                      {bhavcopyEndpoints.map((endpoint, index) => (
                        <AccordionItem
                          key={`bh-${index}`}
                          value={`bhavcopy-${index}`}
                        >
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  endpoint.method === "GET"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {endpoint.method}
                              </Badge>
                              <span className="font-mono text-sm">
                                {endpoint.path}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              <p className="text-sm text-gray-600">
                                {endpoint.description}
                              </p>
                              {endpoint.parameters && (
                                <div>
                                  <h4 className="mb-2 text-sm font-semibold">
                                    Parameters
                                  </h4>
                                  <div className="space-y-2">
                                    {endpoint.parameters.map((param, idx) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-mono">
                                          {param.name}
                                        </span>
                                        <span className="text-gray-500">
                                          {" "}
                                          ({param.type})
                                        </span>
                                        {!param.required && (
                                          <span className="text-gray-400">
                                            {" "}
                                            - optional
                                          </span>
                                        )}
                                        <p className="text-xs text-gray-500">
                                          {param.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={`${PYTHON_API_BASE}/docs#/Bhavcopy`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Try in Swagger
                                </a>
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Backend Formula Endpoints
                    </h3>

                    <Accordion type="single" collapsible className="w-full">
                      {apiEndpoints.map((endpoint, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  endpoint.method === "GET"
                                    ? "default"
                                    : endpoint.method === "POST"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {endpoint.method}
                              </Badge>

                              <span>{endpoint.path}</span>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent>
                            <div className="space-y-3">
                              <p className="text-sm text-gray-600">
                                {endpoint.description}
                              </p>

                              {endpoint.parameters && (
                                <div>
                                  <h4 className="mb-2 text-sm font-semibold">
                                    Parameters:
                                  </h4>

                                  <div className="space-y-2">
                                    {endpoint.parameters.map((param, idx) => (
                                      <div key={idx} className="text-sm">
                                        <span className="font-mono">
                                          {param.name}
                                        </span>

                                        <span className="text-gray-500">
                                          {" "}
                                          ({param.type})
                                        </span>

                                        {!param.required && (
                                          <span className="text-gray-400">
                                            {" "}
                                            - optional
                                          </span>
                                        )}

                                        <p className="text-xs text-gray-500">
                                          {param.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <Button
                                size="sm"
                                onClick={() => runApi(endpoint)}
                                disabled={apiLoading}
                              >
                                Try it out
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="mb-3 text-lg font-semibold">
                      Custom API Call
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <Label>Method</Label>

                        <select
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                          value={customApiMethod}
                          onChange={(e) =>
                            setCustomApiMethod(e.target.value as "GET" | "POST")
                          }
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                        </select>
                      </div>

                      <div>
                        <Label>API Path</Label>

                        <Input
                          placeholder="/vap/formula/your-endpoint"
                          value={customApiPath}
                          onChange={(e) => setCustomApiPath(e.target.value)}
                        />
                      </div>

                      {customApiMethod === "POST" && (
                        <div>
                          <Label>Request Body (JSON)</Label>

                          <Textarea
                            placeholder='{"key": "value"}'
                            value={customApiBody}
                            onChange={(e) => setCustomApiBody(e.target.value)}
                            rows={5}
                          />
                        </div>
                      )}

                      <Button onClick={runCustomApi} disabled={apiLoading}>
                        Execute Custom API
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* API Response Display */}
            {apiResponse && (
              <div className="mt-6">
                <h3 className="mb-2 font-semibold">API Response</h3>

                <Alert
                  variant={apiResponse.success ? "default" : "destructive"}
                  className={
                    apiResponse.success
                      ? "bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        Status:{" "}
                        <Badge
                          className={
                            apiResponse.success ? "bg-green-500" : "bg-red-500"
                          }
                        >
                          {apiResponse.success ? "Success" : "Failed"}
                        </Badge>
                        {apiResponse.status && (
                          <span className="ml-2">
                            HTTP {apiResponse.status}
                          </span>
                        )}
                      </div>

                      <pre className="max-w-3xl text-wrap rounded bg-gray-100 p-2 text-xs">
                        {JSON.stringify(
                          apiResponse.success
                            ? apiResponse.data
                            : apiResponse.response,
                          null,
                          2,
                        )}
                      </pre>

                      <div className="text-xs text-gray-500">
                        Timestamp: {apiResponse.timestamp}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {apiLoading && (
              <div className="py-4 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
                <p className="mt-2">Executing API...</p>
              </div>
            )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MasterIndex;
