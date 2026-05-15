import React, { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { getListedDailyData } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "@/components/ui/custom-pagination";
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
  const { isAuthenticated, user } = useAuth();

  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<ListedDailyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [stocks, setStocks] = useState<string[]>([]);
  const [stocksReady, setStocksReady] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const stocksStorageKey = user?.email
    ? `listed-companies-stocks:${user.email}`
    : "listed-companies-stocks:guest";

  const formatSymbol = (symbol?: string) =>
    symbol?.replace(/\.NS$/i, "") || "-";

  const listedCompanies = data?.listed_companies;

  const rows: ListedRow[] = Array.isArray(listedCompanies?.data)
    ? listedCompanies.data
    : [];

  const totalRecords = listedCompanies?.total || 0;

  const totalPages =
    listedCompanies?.pages ||
    Math.ceil(totalRecords / itemsPerPage) ||
    1;

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
    if (typeof window === "undefined") {
      return;
    }

    setStocksReady(false);

    const storedStocks = window.localStorage.getItem(stocksStorageKey);

    try {
      setStocks(storedStocks ? JSON.parse(storedStocks) : []);
    } catch {
      setStocks([]);
    }

    setStocksReady(true);
  }, [stocksStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !stocksReady) {
      return;
    }

    window.localStorage.setItem(stocksStorageKey, JSON.stringify(stocks));
  }, [stocks, stocksStorageKey, stocksReady]);

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

  const handleAction = async (symbol?: string, action?: string) => {
    if (!symbol || !action) return;

    if (!isAuthenticated) {
      return;
    }

    try {
      if (action === "add") {
        setStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
      } else if (action === "remove") {
        setStocks((prev) => prev.filter((item) => item !== symbol));
      }
    } catch (error) {
      console.error("stock action failed", error);
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
          <div className="rounded-lg bg-white p-6 shadow">
            Loading data...
          </div>
        )}

        {!loading && data && (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-xl bg-white shadow">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Listed Companies
                  </h2>

                  <p className="text-sm text-slate-500">
                    {totalRecords} rows available
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  listed_companies table
                </div>
              </div>

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
                        const inStocks = symbol
                          ? stocks.includes(symbol)
                          : false;

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
                                onClick={() =>
                                  handleAction(
                                    symbol,
                                    inStocks ? "remove" : "add"
                                  )
                                }
                                disabled={!isAuthenticated}
                                className="inline-flex items-center justify-center transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                                title={
                                  isAuthenticated
                                    ? inStocks
                                      ? "Remove from stocks"
                                      : "Add to stocks"
                                    : "Login to add"
                                }
                              >
                                {/* <svg
                                  className={`h-6 w-6 ${
                                    inStocks
                                      ? "fill-red-500"
                                      : "fill-white stroke-slate-400"
                                  } stroke-2`}
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg> */}
                                <Bookmark height={10} width={10}  />
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