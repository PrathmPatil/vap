import React, { useEffect, useState } from "react";
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
import { Bookmark } from "lucide-react";

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
};

type ListedCompaniesResponse = {
  total?: number;
  page?: number;
  pages?: number;
  data?: ListedRow[];
};

type ListedDailyResponse = {
  listed_companies?: ListedCompaniesResponse;
  [key: string]: any;
};

export default function ListedCompaniesPage() {
  const { isAuthenticated } = useAuth();

  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

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
    limit = itemsPerPage
  ) => {
    setLoading(true);

    try {
      const res = await getListedDailyData(
        nextDate || "",
        page,
        limit,
        nextSearch || ""
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
    loadData(date, search, currentPage, itemsPerPage);
  }, [isAuthenticated, currentPage, itemsPerPage]);

  useEffect(() => {
    loadWatchlist();
  }, [isAuthenticated]);

  const handleLoadData = () => {
    setCurrentPage(1);
    loadData(date, search, 1, itemsPerPage);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleWatchlistToggle = async (symbol?: string) => {
    if (!symbol || !isAuthenticated || watchlistBusy) return;

    const inList = isInWatchlist(symbol);
    setWatchlistBusy(symbol);

    // Optimistic UI
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Listed Companies Daily Data
            </h1>

            <p className="text-slate-600">
              Browse bhavcopy and PR data, then add any stock to your watchlist.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLoadData();
                }
              }}
              placeholder="Search symbol or company"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 md:w-72"
            />

            <button
              type="button"
              onClick={handleLoadData}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Load Data
            </button>
          </div>
        </div>

        {loading && (
          <PageLoader inline message="Loading listed companies…" />
        )}

        {!loading && data && (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-xl bg-white shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Symbol</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Series</th>
                      <th className="px-4 py-3 text-left">Listing Date</th>
                      <th className="px-4 py-3 text-right">Face Value</th>
                      <th className="px-4 py-3 text-right">Paid-up Value</th>
                      <th className="px-4 py-3 text-right">Market Lot</th>
                      <th className="px-4 py-3 text-left">ISIN</th>
                      <th className="px-4 py-3 text-center">Watchlist</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
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
                                onClick={() => handleWatchlistToggle(symbol)}
                                disabled={!isAuthenticated || busy}
                                className="inline-flex items-center justify-center rounded p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                                title={
                                  isAuthenticated
                                    ? inWatchlist
                                      ? "Remove from watchlist"
                                      : "Add to watchlist"
                                    : "Login to manage watchlist"
                                }
                                aria-label={
                                  inWatchlist
                                    ? "Remove from watchlist"
                                    : "Add to watchlist"
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
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t bg-slate-50 px-6 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Total Records:{" "}
                    <span className="font-semibold text-slate-900">
                      {totalRecords}
                    </span>
                  </span>

                  <span>
                    Page{" "}
                    <span className="font-semibold text-slate-900">
                      {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {totalPages}
                    </span>
                  </span>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
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
