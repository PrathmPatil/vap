import { getFinnhubData, getMarketHolidays } from "@/utils";
import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "./ui/badge";
import CustomPagination from "./ui/custom-pagination";

// ==================== TYPES ====================
interface MarketStatus {
  id: number;
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string | null;
  timezone: string | null;
}

interface MarketHoliday {
  id: number;
  holiday_date: string;
  day: string;
  description: string;
  segments: string[]; // Added based on your usage
  eventName?: string; // For old format compatibility
  atDate?: string;
}

interface IPOCalendar {
  id: number;
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number | null;
  price: string | null;
  status: string;
  symbol: string;
}

interface EarningsCalendar {
  id: number;
  date: string;
  epsActual: string | null;
  epsEstimate: number | null;
  quarter: number | null;
  revenueActual: string | null;
  symbol: string;
  year: number | null;
}

type TableType = "market-status" | "market-holiday" | "market-holiday-old" | "ipo-calendar" | "earnings-calendar";

const MarketDataDashboard: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>("market-holiday");
  const [data, setData] = useState<any[]>([]);
  
  // Single Pagination Source of Truth
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified Fetch Function
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      
      if (selectedTable === "market-holiday") {
        response = await getMarketHolidays(page, limit, "");
      } else {
        const endpointMap: Record<string, string> = {
          "market-status": "market_status",
          "ipo-calendar": "ipo_calendar",
          "earnings-calendar": "earnings_calendar",
          "market-holiday-old": "market_holiday"
        };
        response = await getFinnhubData(endpointMap[selectedTable], { page, limit });
      }

      if (!response.success) throw new Error(response.message || "Failed to fetch");

      setData(response.data || []);
      setTotalPages(response.pagination?.total_pages || response.pagination?.pages || 0);
      setTotalRecords(response.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle table switch
  const handleTableChange = (table: TableType) => {
    setSelectedTable(table);
    setPage(1); // Reset to first page on switch
  };

  // Helper Formatters
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString() : "-";
  const formatCurrency = (v: any) => {
    const num = parseFloat(v);
    return isNaN(num) ? "-" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  // ==================== TABLE RENDERS ====================

  const renderContent = () => {
    if (loading) return <div className="p-20 text-center animate-pulse">Loading data...</div>;
    if (error) return <div className="p-10 text-red-500 bg-red-50 rounded-lg">{error}</div>;
    if (data.length === 0) return <div className="p-20 text-center text-gray-400">No records found.</div>;

    switch (selectedTable) {
      case "market-holiday":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Segments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item: MarketHoliday) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(item.holiday_date)} ({item.day})</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                  <td className="px-4 py-3 text-sm flex gap-1">
                    {item.segments?.map(s => <Badge key={s} variant="outline">{s}</Badge>) || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "market-status":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Exchange</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item: MarketStatus) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{item.exchange}</td>
                  <td className="px-4 py-3">
                    <Badge className={item.isOpen ? "bg-green-500" : "bg-red-500"}>
                      {item.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.session || item.holiday || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      // ... Add other table cases (IPO, Earnings) here following the same pattern
      default:
        return <div className="p-10 text-center">Table view not implemented.</div>;
    }
  };

  return (
    <div className="">
      {/* Header & Selectors */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">Market Insights</h1>
        <div className="flex flex-wrap gap-2">
          {([ "market-holiday"] as TableType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTableChange(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedTable === t ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.replace("-", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          {renderContent()}
        </div>
        
        {/* Pagination Footer */}
        <div className="border-t p-4 bg-gray-50">
          <CustomPagination
            page={page}
            limit={limit}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(l:any) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketDataDashboard;