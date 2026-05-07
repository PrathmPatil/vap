import axios from "axios";
import { useEffect, useState } from "react";
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

interface LogEntry {
  id: number;
  job_name: string;
  job_group: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: "success" | "failed" | "running";
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

const MasterIndex = () => {
  const [logsData, setLogsData] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  });
  const [statusCounts, setStatusCounts] = useState({total: 0, success: 0, failed: 0, running: 0});
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

  // Fetch logs with filters
  const fetchLogsData = async () => {
    setLoading(true);
    console.log(statusFilter);
    try {
      // Build filters object
      const filters: any = {};

      if (statusFilter !== "all") {
        filters.status = statusFilter.toLowerCase();
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

      const response = await getLogs(
        pagination.page,
        pagination.limit,
        searchTerm,
        filters
      );
      
      if (response.success) {
        setLogsData(response.data || []);
        setPagination(response.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          total_pages: 0,
        });
        setStatusCounts(response.statusCounts);
        
        // Extract unique job names from response if available
        if (response.uniqueJobNames && response.uniqueJobNames.length > 0) {
          setUniqueJobNames(response.uniqueJobNames);
        } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Fallback: extract from data
          const logData = response.data as LogEntry[];
          const names = [...new Set(logData.map((log) => log.job_name))];
          setUniqueJobNames(names);
        }
      } else {
        console.error("Failed to fetch logs:", response.message);
        setLogsData([]);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter, dateFilter, startDate, endDate, jobNameFilter, searchTerm]);

  // Fetch logs when dependencies change
  useEffect(() => {
    fetchLogsData();
  }, [pagination.page, pagination.limit, statusFilter, dateFilter, startDate, endDate, jobNameFilter, searchTerm]);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setJobNameFilter("all");
    setSearchTerm("");
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
      }

      setApiResponse({
        success: true,
        data: response?.data,
        status: response?.status,
        timestamp: new Date().toISOString(),
      });

      // Refresh logs after successful API call
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
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "running":
        return <Badge className="bg-yellow-500">Running</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const hasActiveFilters = () => {
    return statusFilter !== "all" || 
           dateFilter !== undefined || 
           startDate !== undefined || 
           endDate !== undefined || 
           jobNameFilter !== "all" ||
           searchTerm !== "";
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Master Index - Cron Job Monitor</h1>

      {/* Filter Section */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
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
              <X className="h-4 w-4 mr-1" />
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Search Filter */}
          <div className="col-span-1">
            <Label className="mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                {uniqueJobNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
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
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
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
                    variant={"outline"}
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
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
                    variant={"outline"}
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
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
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setStatusFilter("all")}
                />
              </Badge>
            )}
            {jobNameFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Job: {jobNameFilter}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setJobNameFilter("all")}
                />
              </Badge>
            )}
            {dateFilter && (
              <Badge variant="secondary" className="gap-1">
                Date: {formatDate(dateFilter)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setDateFilter(undefined)}
                />
              </Badge>
            )}
            {startDate && (
              <Badge variant="secondary" className="gap-1">
                From: {formatDate(startDate)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setStartDate(undefined)}
                />
              </Badge>
            )}
            {endDate && (
              <Badge variant="secondary" className="gap-1">
                To: {formatDate(endDate)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setEndDate(undefined)}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2">Loading logs...</p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Records</div>
            <div className="text-2xl font-bold">{statusCounts.total || 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-600">Success (Current Page)</div>
            <div className="text-2xl font-bold text-green-700">
              {statusCounts.success || 0}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-600">Failed (Current Page)</div>
            <div className="text-2xl font-bold text-red-700">
              {statusCounts.failed || 0}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-600">Running (Current Page)</div>
            <div className="text-2xl font-bold text-yellow-700">
              {statusCounts.running || 0}
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Cron Job Logs</h2>
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
                logsData.map((log: LogEntry) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.id}</TableCell>
                    <TableCell>{log.job_name}</TableCell>
                    <TableCell>{log.job_group}</TableCell>
                    <TableCell>{formatDate(log.start_time)}</TableCell>
                    <TableCell>{formatDate(log.end_time)}</TableCell>
                    <TableCell>{log.duration_seconds}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.records_processed}</TableCell>
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
                  <TableCell colSpan={9} className="text-center">
                    {loading ? "Loading..." : "No logs found matching the filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        {!loading && pagination.total_pages > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {logsData.length} of {pagination.total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.total_pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Keep existing modal code */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cron Job Details: {selectedLog?.job_name}
              {selectedLog?.status === "failed" && (
                <Badge className="ml-2 bg-red-500">Failed</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
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
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.job_name}
                      </div>
                    </div>
                    <div>
                      <Label>Job Group</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.job_group}
                      </div>
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {formatDate(selectedLog.start_time)}
                      </div>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {formatDate(selectedLog.end_time)}
                      </div>
                    </div>
                    <div>
                      <Label>Duration</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.duration_seconds} seconds
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
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.records_processed}
                      </div>
                    </div>
                    <div>
                      <Label>Records Inserted</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.records_inserted}
                      </div>
                    </div>
                    <div>
                      <Label>Records Updated</Label>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {selectedLog.records_updated}
                      </div>
                    </div>
                  </div>

                  {selectedLog.error_message && (
                    <div>
                      <Label className="text-red-600">Error Message</Label>
                      <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                        {selectedLog.error_message}
                      </div>
                    </div>
                  )}

                  {selectedLog.error_traceback && (
                    <div>
                      <Label className="text-red-600">Error Traceback</Label>
                      <pre className="mt-1 p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto text-sm">
                        {selectedLog.error_traceback}
                      </pre>
                    </div>
                  )}

                  {selectedLog.additional_data && (
                    <div>
                      <Label>Additional Data</Label>
                      <pre className="mt-1 p-3 bg-gray-50 rounded overflow-x-auto text-sm">
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
                      className="h-auto py-3 flex flex-col items-start"
                    >
                      <div className="font-semibold">{endpoint.name}</div>
                      <div className="text-xs text-gray-500">
                        {endpoint.method} {endpoint.path}
                      </div>
                      <div className="text-xs mt-1">{endpoint.description}</div>
                    </Button>
                  ))}
                </div>

                {selectedLog?.status === "failed" && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-semibold mb-2">Retry Failed Job</h4>
                    <p className="text-sm mb-3">
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
                  <h3 className="text-lg font-semibold mb-3">
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
                                <h4 className="font-semibold text-sm mb-2">
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
                  <h3 className="text-lg font-semibold mb-3">
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
              <h3 className="font-semibold mb-2">API Response</h3>
              <Alert
                variant={apiResponse.success ? "default" : "destructive"}
                className={
                  apiResponse.success ? "bg-green-50" : "bg-red-50 border-red-200"
                }
              >
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      Status:{" "}
                      <Badge
                        className={
                          apiResponse.success
                            ? "bg-green-500"
                            : "bg-red-500"
                        }
                      >
                        {apiResponse.success ? "Success" : "Failed"}
                      </Badge>
                      {apiResponse.status && (
                        <span className="ml-2">HTTP {apiResponse.status}</span>
                      )}
                    </div>
                    <pre className="text-xs max-w-3xl text-wrap word-wrap p-2 bg-gray-100 rounded">
                      {JSON.stringify(
                        apiResponse.success ? apiResponse.data : apiResponse.response,
                        null,
                        2
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
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2">Executing API...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterIndex;