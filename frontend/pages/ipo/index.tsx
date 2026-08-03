import IpoTable from "@/components/IpoTables";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import CustomPagination from "@/components/ui/custom-pagination";
import { PageLoader } from "@/components/ui/PageLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNseIpoCounts, getNseIpoData } from "@/utils";
import { useEffect, useState } from "react";

export interface IpoData {
  id: number;
  _id: string;
  _URLRewrite_Folder_Name: string;
  created_at: string;
  type?: "mainboard_data" | "sme_data";

  Company_Name?: string;
  Close_Date?: string;
  Open_Date?: string;

  _Issue_Open_Date?: string;
  _Issue_Close_Date?: string;

  QIB_x_?: string;
  NII_x_?: string;
  bNII_x_?: string;
  sNII_x_?: string;
  Retail_x_?: string;
  Employee_x_?: string;
  Shareholder_x_?: string;
  Others_x_?: string;
  Total_x_?: string;

  Applications?: string;
  Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_?: string;
  issue_status?: string;
  price_band?: string;
  issue_size_shares?: string;
  lot_size?: string;
  listing_date?: string;
  security_type?: string;
  data_source?: string;
}

export interface SortConfig {
  key: keyof IpoData | null;
  direction: "asc" | "desc";
}

interface IpoResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: IpoData[];
  message?: string;
}

export type IpoResponse2 = IpoResponse;

type IpoStatusFilter = "current" | "upcoming" | "past";
type BoardFilter = "all" | "mainboard" | "sme";

const STATUS_TABS: { value: IpoStatusFilter; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "upcoming", label: "Upcoming Issues" },
  { value: "past", label: "Past Issues" },
];

const BOARD_TABS: { value: BoardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mainboard", label: "Mainboard" },
  { value: "sme", label: "SME" },
];

const Index = () => {
  const [statusFilter, setStatusFilter] = useState<IpoStatusFilter>("current");
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [ipoData, setIpoData] = useState<IpoResponse>({
    success: false,
    total: 0,
    page: 1,
    pages: 1,
    data: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "_Issue_Open_Date",
    direction: "desc",
  });
  const [counts, setCounts] = useState({
    current: 0,
    upcoming: 0,
    past: 0,
    mainboard: 0,
    sme: 0,
    total: 0,
  });

  const totalPages = ipoData.pages || Math.ceil(ipoData.total / recordsPerPage) || 1;

  const fetchIpoData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getNseIpoData(
        currentPage,
        recordsPerPage,
        statusFilter,
        boardFilter,
      );

      if (response.success) {
        const total = response.total ?? 0;
        setIpoData({
          success: response.success,
          total,
          page: currentPage,
          pages: Math.ceil(total / recordsPerPage) || 1,
          data: (response.data || []) as unknown as IpoData[],
          message: response.message,
        });
      } else {
        setIpoData({
          success: false,
          total: 0,
          page: 1,
          pages: 1,
          data: [],
          message: response.message,
        });
        setError(response.message || "Failed to fetch IPO data");
      }
    } catch (err) {
      console.error("Error fetching IPO data:", err);
      setIpoData({
        success: false,
        total: 0,
        page: 1,
        pages: 1,
        data: [],
      });
      setError("Failed to fetch IPO data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await getNseIpoCounts();
      if (response.success) {
        setCounts(response.counts);
      }
    } catch (err) {
      console.error("Error fetching IPO counts:", err);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchIpoData();
  }, [statusFilter, boardFilter, currentPage, recordsPerPage]);

  const handleSort = (key: keyof IpoData) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as IpoStatusFilter);
    setCurrentPage(1);
  };

  const handleBoardChange = (value: string) => {
    setBoardFilter(value as BoardFilter);
    setCurrentPage(1);
  };

  if (loading && currentPage === 1 && ipoData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <PageLoader inline message="Loading IPO data…" />
        </main>
      </div>
    );
  }

  const statusCount =
    statusFilter === "current"
      ? counts.current
      : statusFilter === "upcoming"
        ? counts.upcoming
        : counts.past;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">IPO Issues</h2>
            <p className="text-sm text-gray-500">
              Current, upcoming, and past IPO issues from NSE India
            </p>
          </div>

          <div className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">{ipoData.total}</span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">{statusCount}</span>{" "}
            NSE records
          </div>
        </div>

        <Tabs value={statusFilter} onValueChange={handleStatusChange}>
          <TabsList className="grid w-full grid-cols-3">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <Badge className="ml-2" variant="secondary">
                  {tab.value === "current"
                    ? counts.current
                    : tab.value === "upcoming"
                      ? counts.upcoming
                      : counts.past}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={boardFilter} onValueChange={handleBoardChange}>
          <TabsList className="grid w-full grid-cols-3">
            {BOARD_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.value !== "all" && (
                  <Badge className="ml-2" variant="outline">
                    {tab.value === "mainboard" ? counts.mainboard : counts.sme}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {loading && (
            <div className="rounded-lg border bg-white p-3 text-sm text-gray-500">
              Loading NSE IPO data...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <IpoTable
            data={ipoData.data}
            loading={loading}
            sortConfig={sortConfig}
            onSort={handleSort}
            showSubscription={statusFilter === "current"}
          />

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                Total Records:{" "}
                <span className="font-semibold text-gray-900">
                  {ipoData.total || 0}
                </span>
              </span>

              <span>
                Page{" "}
                <span className="font-semibold text-gray-900">{currentPage}</span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
            </div>

            <CustomPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                if (page < 1 || page > totalPages) return;
                setCurrentPage(page);
              }}
              pageSize={recordsPerPage}
              onPageSizeChange={(size) => {
                setRecordsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
