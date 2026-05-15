import IpoTable from "@/components/IpoTables";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import CustomPagination from "@/components/ui/custom-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIpoData, getIpoReportsCount } from "@/utils";
import { useEffect, useState } from "react";

// Types
export interface IpoData {
  id: number;
  _id: string;
  _URLRewrite_Folder_Name: string;
  created_at: string;
  type: "mainboard_data" | "sme_data";

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

export interface IpoItem {
  name: string;
  symbol: string;
  issuePrice: number;
  lotSize: number;
  listingDate: string;
  [key: string]: any;
}

export interface IpoResponse2 {
  success: boolean;
  data: IpoItem[];
  totalRecords?: number;
  message?: string;
}

type IpoType = "mainboard_data" | "sme_data";

const Index = () => {
  const [ipoType, setIpoType] = useState<IpoType>("mainboard_data");

  const [ipoData, setIpoData] = useState<{
    mainboard_data: IpoResponse;
    sme_data: IpoResponse;
  }>({
    mainboard_data: {
      success: false,
      total: 0,
      page: 1,
      pages: 1,
      data: [],
    },
    sme_data: {
      success: false,
      total: 0,
      page: 1,
      pages: 1,
      data: [],
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "Company_Name",
    direction: "asc",
  });

  const [reportCounts, setReportCounts] = useState<{
    mainboard_data: number;
    sme_data: number;
  }>({
    mainboard_data: 0,
    sme_data: 0,
  });

  const currentData = ipoData[ipoType];

  const totalRecords = currentData?.total || 0;

  const totalPages =
    currentData?.pages ||
    Math.ceil(totalRecords / recordsPerPage) ||
    1;

  // Fetch data for selected IPO type
  const fetchIpoData = async (type: IpoType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getIpoData(type, currentPage, recordsPerPage);

      if (response.success) {
        const safeResponse: IpoResponse = {
          success: response.success,
          total: response.total || 0,
          page: response.page || currentPage,
          pages:
            response.pages ||
            Math.ceil((response.total || 0) / recordsPerPage) ||
            1,
          data: response.data || [],
          message: response.message,
        };

        setIpoData((prev) => ({
          ...prev,
          [type]: safeResponse,
        }));

        setError(null);
      } else {
        setIpoData((prev) => ({
          ...prev,
          [type]: {
            success: false,
            total: 0,
            page: 1,
            pages: 1,
            data: [],
            message: response.message,
          },
        }));

        setError(response.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching IPO data:", err);

      setIpoData((prev) => ({
        ...prev,
        [type]: {
          success: false,
          total: 0,
          page: 1,
          pages: 1,
          data: [],
        },
      }));

      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCounts = async () => {
    try {
      const countResponse = await getIpoReportsCount([
        "mainboard_data",
        "sme_data",
      ]);

      if (countResponse.success) {
        setReportCounts(countResponse.counts);
      } else {
        setReportCounts({
          mainboard_data: 0,
          sme_data: 0,
        });

        console.error("Failed to fetch report counts:", countResponse?.message);
      }
    } catch (err) {
      console.error("Error fetching report counts:", err);

      setReportCounts({
        mainboard_data: 0,
        sme_data: 0,
      });
    }
  };

  useEffect(() => {
    fetchReportCounts();
  }, []);

  useEffect(() => {
    fetchIpoData(ipoType);
  }, [ipoType, currentPage, recordsPerPage]);

  const handleSort = (key: keyof IpoData) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleTabChange = (value: string) => {
    setIpoType(value as IpoType);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (newLimit: number) => {
    setRecordsPerPage(newLimit);
    setCurrentPage(1);
  };

  // Render loading state only for first page initial load
  if (loading && currentPage === 1 && currentData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8 text-center">
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-6 w-96 mx-auto" />

            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Render error state only when no data available
  if (error && currentPage === 1 && currentData.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12 text-red-600 text-lg">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* <Navigation /> */}

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              IPO Listing - {ipoType === "mainboard_data" ? "Mainboard" : "SME"}
            </h2>

            <p className="text-sm text-gray-500">
              Browse IPO subscription and listing data
            </p>
          </div>

          <div className="text-sm text-gray-500">
            Total Records:{" "}
            <span className="font-semibold text-gray-900">
              {totalRecords}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={ipoType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            {(["mainboard_data", "sme_data"] as IpoType[]).map((type) => (
              <TabsTrigger key={type} value={type}>
                {type === "mainboard_data" ? "Mainboard" : "SME"}

                <Badge className="ml-2">
                  {reportCounts[type]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {(["mainboard_data", "sme_data"] as IpoType[]).map((type) => {
            const tabData = ipoData[type];

            return (
              <TabsContent key={type} value={type}>
                <div className="space-y-4">
                  {loading && (
                    <div className="rounded-lg border bg-white p-3 text-sm text-gray-500">
                      Loading data...
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <IpoTable
                    data={tabData.data}
                    loading={loading}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />

                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>
                        Total Records:{" "}
                        <span className="font-semibold text-gray-900">
                          {tabData.total || 0}
                        </span>
                      </span>

                      <span>
                        Page{" "}
                        <span className="font-semibold text-gray-900">
                          {currentPage}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-900">
                          {totalPages}
                        </span>
                      </span>
                    </div>

                    <CustomPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      pageSize={recordsPerPage}
                      onPageSizeChange={handleRecordsPerPageChange}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;