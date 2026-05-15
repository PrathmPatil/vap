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
  segments: string[];
  eventName?: string;
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

type TableType =
  | "market-status"
  | "market-holiday"
  | "market-holiday-old"
  | "ipo-calendar"
  | "earnings-calendar";

const MarketDataDashboard: React.FC = () => {
  const [selectedTable, setSelectedTable] =
    useState<TableType>("market-holiday");

  const [data, setData] = useState<any[]>([]);

  // Single pagination source of truth
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH DATA ====================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      if (selectedTable === "market-holiday") {
        response = await getMarketHolidays(page, limit, "");
      } else {
        const endpointMap: Record<TableType, string> = {
          "market-status": "market_status",
          "ipo-calendar": "ipo_calendar",
          "earnings-calendar": "earnings_calendar",
          "market-holiday-old": "market_holiday",
          "market-holiday": "market_holiday",
        };

        response = await getFinnhubData(endpointMap[selectedTable], {
          page,
          limit,
        });
      }

      if (!response?.success) {
        throw new Error(response?.message || "Failed to fetch data");
      }

      const pagination = response.pagination || {};

      const total =
        pagination.total_pages ||
        pagination.pages ||
        Math.ceil((pagination.total || 0) / limit) ||
        1;

      setData(response.data || []);
      setTotalPages(total);
      setTotalRecords(pagination.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== HANDLERS ====================
  const handleTableChange = (table: TableType) => {
    setSelectedTable(table);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  // ==================== FORMATTERS ====================
  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString();
  };

  const formatCurrency = (v: any) => {
    const num = parseFloat(v);

    return isNaN(num)
      ? "-"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(num);
  };

  // ==================== TABLE RENDERS ====================
  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-20 text-center animate-pulse">
          Loading data...
        </div>
      );
    }

    if (error) {
      return (
        <div className="m-4 p-4 text-red-500 bg-red-50 rounded-lg">
          {error}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="p-20 text-center text-gray-400">
          No records found.
        </div>
      );
    }

    switch (selectedTable) {
      case "market-holiday":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Segments
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.map((item: MarketHoliday) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(item.holiday_date)}{" "}
                    {item.day ? `(${item.day})` : ""}
                  </td>

                  <td className="px-4 py-3 text-sm font-medium">
                    {item.description || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {item.segments?.length ? (
                        item.segments.map((segment) => (
                          <Badge key={segment} variant="outline">
                            {segment}
                          </Badge>
                        ))
                      ) : (
                        "-"
                      )}
                    </div>
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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Exchange
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Timezone
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.map((item: MarketStatus) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {item.exchange || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      className={item.isOpen ? "bg-green-500" : "bg-red-500"}
                    >
                      {item.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.session || item.holiday || "N/A"}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.timezone || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "market-holiday-old":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Event Name
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.map((item: MarketHoliday) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(item.atDate || item.holiday_date)}
                  </td>

                  <td className="px-4 py-3 text-sm font-medium">
                    {item.eventName || item.description || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "ipo-calendar":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Exchange
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Shares
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.map((item: IPOCalendar) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(item.date)}
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold">
                    {item.symbol || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.name || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.exchange || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.numberOfShares ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.price || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline">
                      {item.status || "-"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "earnings-calendar":
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Quarter
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  EPS Actual
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  EPS Estimate
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">
                  Revenue Actual
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {data.map((item: EarningsCalendar) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(item.date)}
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold">
                    {item.symbol || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.year ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.quarter ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.epsActual ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.epsEstimate ?? "-"}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(item.revenueActual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return (
          <div className="p-10 text-center">
            Table view not implemented.
          </div>
        );
    }
  };

  return (
    <div>
      {/* Header & Selectors */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">Market Insights</h1>

        <div className="flex flex-wrap gap-2">
          {(
            [
              "market-holiday",
              "market-status",
              "market-holiday-old",
              "ipo-calendar",
              "earnings-calendar",
            ] as TableType[]
          ).map((table) => (
            <button
              key={table}
              type="button"
              onClick={() => handleTableChange(table)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedTable === table
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {table.replace(/-/g, " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">{renderContent()}</div>

        {/* Pagination Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Total Records: {totalRecords}
            </p>

            <p className="text-xs text-gray-500">
              Showing page {page} of {totalPages}
            </p>
          </div>

          <CustomPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={limit}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>
    </div>
  );
};

export default MarketDataDashboard;