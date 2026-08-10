import React, { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import {
  addToWatchlist,
  getListedDailyData,
  getUserWatchlist,
  removeFromWatchlist,
} from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "@/components/ui/custom-pagination";
import { PageLoader } from "@/components/ui/PageLoader";
import { Bookmark, Download } from "lucide-react";
import { exportRowsToCsv } from "@/lib/exportData";
import { DatePicker } from "@/components/ui/date-picker";

const SEARCH_DEBOUNCE_MS = 400;

type InstrumentTab = "stocks" | "etfs" | "indices";

type ListedRow = {
  id?: number | string;
  symbol?: string;
  name?: string;
  series?: string;
  date_of_listing?: string | null;
  paid_up_value?: number | null;
  market_lot?: number | null;
  isin?: string;
  face_value?: number | null;
  source?: string;
  close_price?: number | null;
  previous_close?: number | null;
  last?: string | number | null;
  percent_change?: string | number | null;
  high?: string | number | null;
  low?: string | number | null;
  volume?: number | null;
  underlying?: string | null;
  instrument_type?: string;
};

type ListedCompaniesResponse = {
  total?: number;
  page?: number;
  pages?: number;
  data?: ListedRow[];
};

type ListedDailyResponse = {
  listed_companies?: ListedCompaniesResponse;
  as_of?: string | null;
  instrument?: string;
  [key: string]: any;
};

const TABS: { id: InstrumentTab; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "etfs", label: "ETFs" },
  { id: "indices", label: "Indices" },
];

export default function ListedCompaniesPage() {
  const { isAuthenticated } = useAuth();

  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [instrument, setInstrument] = useState<InstrumentTab>("stocks");

  const [data, setData] = useState<ListedDailyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState<string | null>(null);

  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatSymbol = (symbol?: string) =>
    symbol?.replace(/\.NS$/i, "") || "-";

  const normalizeSymbol = (symbol?: string) =>
    String(symbol || "").trim().toUpperCase();

  const listedCompanies = data?.listed_companies;

  const rows: ListedRow[] = Array.isArray(listedCompanies?.data)
    ? listedCompanies.data
    : [];

  const totalRecords = listedCompanies?.total || 0;

  const totalPages =
    listedCompanies?.pages || Math.ceil(totalRecords / itemsPerPage) || 1;

  const isInWatchlist = (symbol?: string) => {
    const key = normalizeSymbol(symbol);
    if (!key) return false;
    return watchlistSymbols.some((item) => {
      const normalized = normalizeSymbol(item);
      return (
        normalized === key ||
        normalized === `${key}.NS` ||
        key === `${normalized}.NS`
      );
    });
  };

  const loadWatchlist = async () => {
    if (!isAuthenticated) {
      setWatchlistSymbols([]);
      return;
    }

    try {
      const response = await getUserWatchlist();
      const items = Array.isArray(response?.data) ? response.data : [];
      setWatchlistSymbols(
        items
          .map((item: { symbol?: string }) => item?.symbol)
          .filter(Boolean) as string[]
      );
    } catch (error) {
      console.error("watchlist fetch failed", error);
      setWatchlistSymbols([]);
    }
  };

  const loadData = async (
    nextDate = date,
    nextSearch = search,
    page = currentPage,
    limit = itemsPerPage,
    nextInstrument = instrument
  ) => {
    setLoading(true);

    try {
      const res = await getListedDailyData(
        nextDate || "",
        page,
        limit,
        nextSearch || "",
        nextInstrument,
        "listing"
      );

      setData(res || null);
    } catch (error) {
      console.error("listed daily fetch failed", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData(date, debouncedSearch, currentPage, itemsPerPage, instrument);
  }, [isAuthenticated, currentPage, itemsPerPage, instrument, debouncedSearch, date]);

  useEffect(() => {
    loadWatchlist();
  }, [isAuthenticated]);

  const handleInstrumentChange = (next: InstrumentTab) => {
    setInstrument(next);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const columns =
      instrument === "stocks"
        ? [
            { key: "symbol", label: "Symbol" },
            { key: "name", label: "Name" },
            { key: "series", label: "Series" },
            { key: "date_of_listing", label: "Listing Date" },
            { key: "face_value", label: "Face Value" },
            { key: "paid_up_value", label: "Paid-up Value" },
            { key: "market_lot", label: "Market Lot" },
            { key: "isin", label: "ISIN" },
          ]
        : instrument === "etfs"
          ? [
              { key: "symbol", label: "Symbol" },
              { key: "name", label: "Name" },
              { key: "series", label: "Series" },
              { key: "close_price", label: "Close" },
              { key: "previous_close", label: "Prev Close" },
              { key: "volume", label: "Volume" },
              { key: "underlying", label: "Underlying" },
            ]
          : [
              { key: "symbol", label: "Symbol" },
              { key: "name", label: "Name" },
              { key: "series", label: "Category" },
              { key: "last", label: "Last" },
              { key: "previous_close", label: "Prev Close" },
              { key: "percent_change", label: "Change %" },
              { key: "high", label: "High" },
              { key: "low", label: "Low" },
            ];

    exportRowsToCsv(rows as Record<string, unknown>[], {
      columns,
      filename: `${instrument}-export.csv`,
    });
  };

  const handleWatchlistToggle = async (symbol?: string) => {
    if (!symbol || !isAuthenticated || watchlistBusy) return;

    const inList = isInWatchlist(symbol);
    setWatchlistBusy(symbol);

    setWatchlistSymbols((prev) => {
      if (inList) {
        return prev.filter((item) => {
          const normalized = normalizeSymbol(item);
          const key = normalizeSymbol(symbol);
          return !(
            normalized === key ||
            normalized === `${key}.NS` ||
            key === `${normalized}.NS`
          );
        });
      }
      return prev.includes(symbol) ? prev : [...prev, symbol];
    });

    try {
      const result = inList
        ? await removeFromWatchlist(symbol)
        : await addToWatchlist(symbol);

      if (result?.unauthorized) {
        await loadWatchlist();
        return;
      }

      await loadWatchlist();
    } catch (error) {
      console.error("watchlist action failed", error);
      await loadWatchlist();
    } finally {
      setWatchlistBusy(null);
    }
  };

  const subtitle = useMemo(() => {
    if (instrument === "etfs") {
      return data?.as_of
        ? `ETF bhavcopy as of ${String(data.as_of).slice(0, 10)}`
        : "Browse ETF market data";
    }
    if (instrument === "indices") {
      return "NSE indices from all_indices";
    }
    if (date) {
      const total = data?.listed_companies?.total ?? 0;
      return total
        ? `Companies with listing date ${date} (${total})`
        : `No companies listed on ${date}`;
    }
    return "Browse listed equities, then add any stock to your watchlist.";
  }, [instrument, data?.as_of, data?.listed_companies?.total, date]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Market Instruments
            </h1>
            <p className="text-slate-600">{subtitle}</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {instrument === "stocks" && (
              <DatePicker
                value={date}
                onChange={handleDateChange}
                placeholder="Listing date"
                aria-label="Filter by listing date"
                clearable
              />
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search symbol or name"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 md:w-72"
            />

            <button
              type="button"
              onClick={handleExport}
              disabled={!rows.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleInstrumentChange(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                instrument === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <PageLoader inline message="Loading market data…" />}

        {!loading && data && (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-xl bg-white shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">
                        {instrument === "indices" ? "Category" : "Series"}
                      </th>
                      {instrument === "stocks" && (
                        <>
                          <th className="px-4 py-3 text-left">Listing Date</th>
                          <th className="px-4 py-3 text-right">Face Value</th>
                          <th className="px-4 py-3 text-right">Paid-up Value</th>
                          <th className="px-4 py-3 text-right">Market Lot</th>
                          <th className="px-4 py-3 text-left">ISIN</th>
                          <th className="px-4 py-3 text-center">Watchlist</th>
                        </>
                      )}
                      {instrument === "etfs" && (
                        <>
                          <th className="px-4 py-3 text-right">Close</th>
                          <th className="px-4 py-3 text-right">Prev Close</th>
                          <th className="px-4 py-3 text-right">Volume</th>
                          <th className="px-4 py-3 text-left">Underlying</th>
                          <th className="px-4 py-3 text-center">Watchlist</th>
                        </>
                      )}
                      {instrument === "indices" && (
                        <>
                          <th className="px-4 py-3 text-right">Last</th>
                          <th className="px-4 py-3 text-right">Prev Close</th>
                          <th className="px-4 py-3 text-right">Change %</th>
                          <th className="px-4 py-3 text-right">High</th>
                          <th className="px-4 py-3 text-right">Low</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No records found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row: ListedRow, idx: number) => {
                        const symbol = row.symbol || "";
                        const inWatchlist = isInWatchlist(symbol);
                        const busy = watchlistBusy === symbol;

                        return (
                          <tr
                            key={`${symbol}-${row.id || idx}`}
                            className="border-t hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {formatSymbol(symbol)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.series || "-"}
                            </td>

                            {instrument === "stocks" && (
                              <>
                                <td className="px-4 py-3 text-slate-700">
                                  {row.date_of_listing || "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.face_value ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.paid_up_value ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.market_lot ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {row.isin || "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWatchlistToggle(symbol)
                                    }
                                    disabled={!isAuthenticated || busy}
                                    className="inline-flex items-center justify-center rounded p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={
                                      isAuthenticated
                                        ? inWatchlist
                                          ? "Remove from watchlist"
                                          : "Add to watchlist"
                                        : "Login to manage watchlist"
                                    }
                                  >
                                    <Bookmark
                                      className={`h-5 w-5 ${
                                        inWatchlist
                                          ? "fill-blue-600 text-blue-600"
                                          : "text-slate-400"
                                      }`}
                                    />
                                  </button>
                                </td>
                              </>
                            )}

                            {instrument === "etfs" && (
                              <>
                                <td className="px-4 py-3 text-right">
                                  {row.close_price ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.previous_close ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.volume ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {row.underlying || "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleWatchlistToggle(symbol)
                                    }
                                    disabled={!isAuthenticated || busy}
                                    className="inline-flex items-center justify-center rounded p-1 disabled:opacity-50"
                                  >
                                    <Bookmark
                                      className={`h-5 w-5 ${
                                        inWatchlist
                                          ? "fill-blue-600 text-blue-600"
                                          : "text-slate-400"
                                      }`}
                                    />
                                  </button>
                                </td>
                              </>
                            )}

                            {instrument === "indices" && (
                              <>
                                <td className="px-4 py-3 text-right">
                                  {row.last ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.previous_close ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.percent_change ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.high ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {row.low ?? "-"}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-white px-4 py-2.5">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={totalRecords}
                  onPageChange={handlePageChange}
                  pageSize={itemsPerPage}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            </section>
          </div>
        )}

        {!loading && !data && (
          <div className="rounded-lg bg-white p-6 text-slate-600 shadow">
            No data returned from the backend. Check the listed-daily API and
            database connection.
          </div>
        )}
      </main>
    </div>
  );
}
