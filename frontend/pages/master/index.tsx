import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getLogs } from "@/utils/apis";
import { formatDate } from "@/lib/utils";
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

  // Predefined API endpoints
  const apiEndpoints: ApiEndpoint[] = [
    {
      name: "Run Manual API",
      path: "/vap/formula/run-manual-api",
      method: "GET",
      description: "Manually trigger the main cron job",
    },
    {
      name: "Process Formula Data",
      path: "/vap/formula/process-formula-data",
      method: "POST",
      description: "Process formula data with specific parameters",
      parameters: [
        {
          name: "date",
          type: "string",
          required: false,
          description: "Date to process (YYYY-MM-DD)",
        },
        {
          name: "formula_id",
          type: "number",
          required: false,
          description: "Specific formula ID to process",
        },
      ],
    },
    {
      name: "Retry Failed Jobs",
      path: "/vap/formula/retry-failed",
      method: "POST",
      description: "Retry all failed cron jobs",
    },
    {
      name: "Clear Cache",
      path: "/vap/formula/clear-cache",
      method: "DELETE",
      description: "Clear formula cache",
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
  const fetchLogsData = async () => {
    setLoading(true);

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

        setLogsData(response.data || []);
        setPagination(nextPagination);
        setStatusCounts(response.statusCounts || DEFAULT_STATUS_COUNTS);

        if (response.uniqueJobNames && response.uniqueJobNames.length > 0) {
          setUniqueJobNames(response.uniqueJobNames);
        } else if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          const logData = response.data as LogEntry[];
          const names = [...new Set(logData.map((log) => log.job_name))];
          setUniqueJobNames(names);
        }
      } else {
        console.error("Failed to fetch logs:", response.message);
        setLogsData([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          total_pages: 1,
        }));
        setStatusCounts(DEFAULT_STATUS_COUNTS);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogsData([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        total_pages: 1,
      }));
      setStatusCounts(DEFAULT_STATUS_COUNTS);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [statusFilter, dateFilter, startDate, endDate, jobNameFilter, searchTerm]);

  // Fetch logs when dependencies change
  useEffect(() => {
    fetchLogsData();
  }, [
    pagination.page,
    pagination.limit,
    statusFilter,
    dateFilter,
    startDate,
    endDate,
    jobNameFilter,
    searchTerm,
  ]);

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
      let response;

      switch (endpoint.method) {
        case "GET":
          response = await axios.get(endpoint.path);
          break;
        case "POST":
          response = await axios.post(endpoint.path, customParams || {});
          break;
        case "PUT":
          response = await axios.put(endpoint.path, customParams || {});
          break;
        case "DELETE":
          response = await axios.delete(endpoint.path);
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
      let response;

      if (customApiMethod === "GET") {
        response = await axios.get(customApiPath);
      } else {
        const body = customApiBody ? JSON.parse(customApiBody) : {};
        response = await axios.post(customApiPath, body);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">
          Master Index - Cron Job Monitor
        </h1>

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

        {/* Loading Indicator */}
        {loading && (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading logs...</p>
          </div>
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
                  <TableHead>ID</TableHead>
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
                      <TableCell>{index + 1}</TableCell>
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
            <div className="mt-4 rounded-xl border bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {logsData.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {pagination.total}
                  </span>{" "}
                  entries
                </span>

                <span>
                  Page{" "}
                  <span className="font-semibold text-gray-900">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {totalPages}
                  </span>
                </span>
              </div>

              <Pagination
                currentPage={pagination.page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pagination.limit}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </div>

        {/* Modal - Keep existing modal code */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Cron Job Details: {selectedLog?.job_name}
                {selectedLog?.status?.toUpperCase() === "FAILED" && (
                  <Badge className="ml-2 bg-red-500">Failed</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-4"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Job Details</TabsTrigger>
                <TabsTrigger value="api">Run API / Retry</TabsTrigger>
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => runApi(endpoint)}
                        disabled={apiLoading}
                        className="flex h-auto flex-col items-start py-3"
                      >
                        <div className="font-semibold">{endpoint.name}</div>
                        <div className="text-xs text-gray-500">
                          {endpoint.method} {endpoint.path}
                        </div>
                        <div className="mt-1 text-xs">
                          {endpoint.description}
                        </div>
                      </Button>
                    ))}
                  </div>

                  {selectedLog?.status?.toUpperCase() === "FAILED" && (
                    <div className="mt-6 rounded border border-yellow-200 bg-yellow-50 p-4">
                      <h4 className="mb-2 font-semibold">Retry Failed Job</h4>
                      <p className="mb-3 text-sm">
                        This cron job failed. You can retry it manually:
                      </p>

                      <Button
                        onClick={() =>
                          runApi({
                            name: `Retry ${selectedLog.job_name}`,
                            path: `/vap/formula/retry/${selectedLog.id}`,
                            method: "POST",
                            description: "Retry failed job",
                          })
                        }
                        disabled={apiLoading}
                      >
                        Retry This Job
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="swagger" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Available API Endpoints
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
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MasterIndex;
