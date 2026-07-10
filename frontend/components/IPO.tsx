import IpoTable from "@/components/IpoTables";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNseIpoCounts, getNseIpoData } from "@/utils";
import { useEffect, useState } from "react";
import Pagination from "@/components/ui/custom-pagination";
import type { IpoData, SortConfig } from "@/pages/ipo/index";

type BoardFilter = "all" | "mainboard" | "sme";

const BOARD_TABS: { value: BoardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mainboard", label: "Mainboard" },
  { value: "sme", label: "SME" },
];

const Ipo = () => {
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [ipoData, setIpoData] = useState<IpoData[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "Company_Name",
    direction: "asc",
  });
  const [counts, setCounts] = useState({ current: 0, mainboard: 0, sme: 0 });

  const fetchCounts = async () => {
    try {
      const response = await getNseIpoCounts();
      if (response.success) {
        setCounts({
          current: response.counts?.current ?? 0,
          mainboard: response.counts?.mainboard ?? 0,
          sme: response.counts?.sme ?? 0,
        });
      }
    } catch (err) {
      console.error("Error fetching IPO counts:", err);
    }
  };

  const fetchIpoData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getNseIpoData(
        "current",
        boardFilter,
        currentPage,
        recordsPerPage,
      );

      if (response.success) {
        setIpoData((response.data || []) as IpoData[]);
        setTotalRecords(response.total ?? 0);
        setTotalPages(response.pages ?? 1);
      } else {
        setIpoData([]);
        setTotalRecords(0);
        setError(response.message || "Failed to fetch IPO data");
      }
    } catch (err) {
      console.error("Error fetching IPO data:", err);
      setIpoData([]);
      setError("Failed to fetch IPO data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchIpoData();
  }, [boardFilter, currentPage, recordsPerPage]);

  const handleSort = (key: keyof IpoData) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const boardCount =
    boardFilter === "mainboard"
      ? counts.mainboard
      : boardFilter === "sme"
        ? counts.sme
        : counts.current;

  if (loading && currentPage === 1 && ipoData.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Current IPO Issues</h2>
          <p className="text-sm text-gray-500">Live NSE subscription data</p>
        </div>
        <div className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-900">{boardCount}</span> issues
        </div>
      </div>

      <Tabs
        value={boardFilter}
        onValueChange={(value) => {
          setBoardFilter(value as BoardFilter);
          setCurrentPage(1);
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          {BOARD_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <Badge className="ml-2">
                {tab.value === "all"
                  ? counts.current
                  : tab.value === "mainboard"
                    ? counts.mainboard
                    : counts.sme}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {BOARD_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : (
              <IpoTable
                data={ipoData}
                loading={loading}
                sortConfig={sortConfig}
                onSort={handleSort}
                showSubscription
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {totalPages > 1 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          recordsPerPage={recordsPerPage}
          onRecordsPerPageChange={(limit) => {
            setRecordsPerPage(limit);
            setCurrentPage(1);
          }}
          totalRecords={totalRecords}
        />
      ) : null}
    </div>
  );
};

export default Ipo;
