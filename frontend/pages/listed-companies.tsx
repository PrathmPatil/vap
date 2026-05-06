import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { getListedDailyData } from '@/utils';
import { useAuth } from '@/context/AuthContext';
import { Pagination } from '@/components/ui/custom-pagination';

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

export default function ListedCompaniesPage() {
  const { isAuthenticated, user } = useAuth();
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<string[]>([]);
  const [stocksReady, setStocksReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const stocksStorageKey = user?.email ? `listed-companies-stocks:${user.email}` : 'listed-companies-stocks:guest';
  const formatSymbol = (symbol?: string) => symbol?.replace(/\.NS$/i, '') || '-';

  const loadData = async (nextDate = date, nextSearch = search) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await getListedDailyData(nextDate || '', 1, 100, nextSearch || '');
      setData(res);
    } catch (error) {
      console.error('listed daily fetch failed', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') {
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
    if (typeof window === 'undefined' || !stocksReady) {
      return;
    }

    window.localStorage.setItem(stocksStorageKey, JSON.stringify(stocks));
  }, [stocks, stocksStorageKey, stocksReady]);

  const displayRows: ListedRow[] = useMemo(() => {
    const allRows = Array.isArray(data?.listed_companies?.data) ? data.listed_companies.data : [];
    const start = (currentPage - 1) * itemsPerPage;
    return allRows.slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const handleAction = async (symbol?: string, action?: string) => {
    if (!symbol || !action) return;

    if (!isAuthenticated) {
      return;
    }

    try {
      if (action === 'add') {
        setStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
      } else if (action === 'remove') {
        setStocks((prev) => prev.filter((item) => item !== symbol));
      }
    } catch (error) {
      console.error('stock action failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Listed Companies Daily Data</h1>
            <p className="text-slate-600">Browse bhavcopy and PR data, then add any stock to your watchlist.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or company"
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white md:w-72"
            />
            <button
              onClick={() => loadData(date, search)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Load Data
            </button>
          </div>
        </div>

        {loading && <div className="rounded-lg bg-white p-6 shadow">Loading data...</div>}

        {!loading && data && (
          <div className="space-y-8">
            <section className="rounded-xl bg-white shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Listed Companies</h2>
                  <p className="text-sm text-slate-500">{data.listed_companies?.total ?? 0} rows available</p>
                </div>
                <div className="text-sm text-slate-500">
                  listed_companies table
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
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
                    {displayRows.map((row: ListedRow, idx: number) => {
                      const symbol = row.symbol || '';
                      const inStocks = symbol ? stocks.includes(symbol) : false;

                      return (
                        <tr key={`${symbol}-${row.id || idx}`} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{formatSymbol(symbol)}</td>
                          <td className="px-4 py-3 text-slate-700">{row.name || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{row.series || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{row.date_of_listing || '-'}</td>
                          <td className="px-4 py-3 text-right">{row.face_value ?? '-'}</td>
                          <td className="px-4 py-3 text-right">{row.paid_up_value ?? '-'}</td>
                          <td className="px-4 py-3 text-right">{row.market_lot ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{row.isin || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleAction(symbol, inStocks ? 'remove' : 'add')}
                              disabled={!isAuthenticated}
                              className="inline-flex items-center justify-center hover:scale-110 transition-transform"
                              title={isAuthenticated ? (inStocks ? 'Remove from stocks' : 'Add to stocks') : 'Login to add'}
                            >
                              <svg
                                className={`w-6 h-6 ${inStocks ? 'fill-red-500' : 'fill-white stroke-slate-400'} stroke-2`}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {data?.listed_companies?.total && (
                <div className="px-6 py-4 border-t bg-slate-50">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(data.listed_companies.total / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    pageSizeLabel={`${itemsPerPage} per page`}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && !data && (
          <div className="rounded-lg bg-white p-6 shadow text-slate-600">
            No data returned from the backend. Check the listed-daily API and database connection.
          </div>
        )}
      </main>
    </div>
  );
}
