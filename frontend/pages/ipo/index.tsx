import IpoTable from "@/components/IpoTables";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIpoData, getIpoReportsCount } from "@/utils";
import { useEffect, useState } from "react";

// Types
interface IpoData {
  id: number;
  Company_Name: string;
  Close_Date: string;
  Open_Date: string;
  QIB_x_: string;
  NII_x_: string;
  Retail_x_: string;
  Applications: string;
  Total_x_: string;
  _Highlight_Row: string;
  _Issue_Open_Date: string;
  _Issue_Close_Date: string;
  _id: string;
  _URLRewrite_Folder_Name: string;
  Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: string;
  created_at: string;
  type: "mainboard_data" | "sme_data";
}

interface IpoResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: IpoData[];
}

interface SortConfig {
  key: keyof IpoData | null;
  direction: "asc" | "desc";
}

// types/ipo.ts
export interface IpoItem {
  name: string;
  symbol: string;
  issuePrice: number;
  lotSize: number;
  listingDate: string;
  [key: string]: any; // for extra fields
}

export interface IpoResponse2 {
  success: boolean;
  data: IpoItem[];
  totalRecords?: number;
  message?: string;
}

const Index = () => {
  const [ipoType, setIpoType] = useState<"mainboard_data" | "sme_data">(
    "mainboard_data",
  );
  const [ipoData, setIpoData] = useState<{
    mainboard_data: IpoResponse;
    sme_data: IpoResponse;
  }>({
    mainboard_data: { success: false, total: 0, page: 1, pages: 0, data: [] },
    sme_data: { success: false, total: 0, page: 1, pages: 0, data: [] },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "Company_Name",
    direction: "asc",
  });
  const [reportCounts, setReportCounts] = useState<{
    mainboard_data: number;
    sme_data: number;
  }>({ mainboard_data: 0, sme_data: 0 });

  // Fetch data for selected IPO type
  const fetchIpoData = async (type: "mainboard_data" | "sme_data") => {
    setLoading(true);

    try {
      const response = await getIpoData(type, currentPage, recordsPerPage);

      if (response.success) {
        setIpoData((prev) => ({
          ...prev,
          [type]: response,
        }));
        // page
// : 
// 1
// pages
// : 
// 9
// reportType
// : 
// "mainboard_data"
// success
// : 
// true
// total
// : 
// 82

        setError(null);
      } else {
        setError(response.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching IPO data:", err);
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
        setReportCounts({ mainboard_data: 0, sme_data: 0 });
        console.error("Failed to fetch report counts:", countResponse?.message);
      }
    } catch (err) {
      console.error("Error fetching report counts:", err);
    }
  };

  // Fetch IPO data when tab, page, or records per page change
  useEffect(() => {
    fetchReportCounts();
  }, []);

  useEffect(() => {
    fetchIpoData(ipoType);
  }, [ipoType, currentPage, recordsPerPage]);

  const handleSort = (key: any) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

   const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };


  const currentData = ipoData[ipoType];
  const totalPages = currentData.pages;

  // Render loading state
  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8 text-center">
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-6 w-96 mx-auto" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Render error state
  if (error && currentPage === 1) {
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
      <Navigation />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900">
          IPO Listing - {ipoType === "mainboard_data" ? "Mainboard" : "SME"}
        </h2>

        {/* Tabs */}
        <Tabs
          value={ipoType}
          onValueChange={(val) => {
            setIpoType(val as "mainboard_data" | "sme_data");
            setCurrentPage(1); // 🔥 Reset pagination on tab change
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            {["mainboard_data", "sme_data"].map((type) => (
              <TabsTrigger key={type} value={type}>
                {type === "mainboard_data" ? "Mainboard" : "SME"}
                <Badge className="ml-2">
                  {reportCounts[type as "mainboard_data" | "sme_data"]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {/* {
    "id": 80,
    "Company_Name": "Shadowfax Technologies Ltd.",
    "Close_Date": "Jan 22, 2026",
    "QIB_x_": "4",
    "NII_x_": "0.88",
    "Retail_x_": "2.43",
    "Employee_x_": "2.17",
    "Others_x_": "",
    "Applications": "2,25,616",
    "Total_x_": "2.86",
    "_Highlight_Row": "",
    "_Issue_Open_Date": "2026-01-20",
    "_Issue_Close_Date": "2026-01-22",
    "_id": "2526",
    "_URLRewrite_Folder_Name": "shadowfax-technologies-ipo",
    "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_": "1907.27",
    "bNII_x_": "0.66",
    "sNII_x_": "1.33",
    "created_at": "2026-03-09T00:47:50.000Z"
} */}

          {["mainboard_data", "sme_data"].map((type) => (
            <TabsContent key={type} value={type}>
              <IpoTable
                data={ipoData[type as "mainboard_data" | "sme_data"].data}
                loading={loading}
                // currentPage={currentPage}
                // recordsPerPage={recordsPerPage}
                // totalItems={
                //   ipoData[type as "mainboard_data" | "sme_data"].total
                // }
                // totalPages={
                //   ipoData[type as "mainboard_data" | "sme_data"].pages
                // }
                // onPageChange={handlePageChange}
                // onRecordsPerPageChange={handleRecordsPerPageChange}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
                            {/* ✅ Pagination Controls */}
              <div className="flex items-center justify-center space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {getVisiblePages().map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
