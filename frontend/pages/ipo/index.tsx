import IpoTable from "@/components/IpoTables";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIpoData } from "@/utils";
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
  const [ipoType, setIpoType] = useState<"mainboard_data" | "sme_data">("mainboard_data");
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
    key: null,
    direction: "asc",
  });

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

  // Fetch IPO data when tab, page, or records per page change
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

  const handleRecordsPerPageChange = (value: number) => {
    setRecordsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
                  {ipoData[type as "mainboard_data" | "sme_data"].total}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {["mainboard_data", "sme_data"].map((type) => (
            <TabsContent key={type} value={type}>
              <IpoTable
                data={ipoData[type as "mainboard_data" | "sme_data"].data}
                loading={loading}
                currentPage={currentPage}
                recordsPerPage={recordsPerPage}
                totalItems={ipoData[type as "mainboard_data" | "sme_data"].total}
                totalPages={ipoData[type as "mainboard_data" | "sme_data"].pages}
                onPageChange={handlePageChange}
                onRecordsPerPageChange={handleRecordsPerPageChange}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
