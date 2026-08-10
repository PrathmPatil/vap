import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  Check,
} from "lucide-react";
import {
  addToWatchlist,
  getListedDailyData,
  getUserWatchlist,
  removeFromWatchlist,
} from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/PageLoader";

type WatchlistItem = {
  symbol: string;
  name: string;
  series?: string;
  sector?: string;
  date_of_listing?: string | null;
  as_of?: string | null;
  addedAt?: string;
  latest?: {
    date?: string;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    previous_close?: number | null;
    volume?: number | null;
  } | null;
};

type Company = {
  symbol: string;
  name: string;
  series?: string;
  date_of_listing?: string | null;
  isin?: string | null;
  face_value?: number | null;
  instrument?: "stocks" | "etfs" | "indices";
};

type InstrumentTab = "stocks" | "etfs" | "indices";

const INSTRUMENT_TABS: { id: InstrumentTab; label: string }[] = [
  { id: "stocks", label: "Stocks" },
  { id: "etfs", label: "ETFs" },
  { id: "indices", label: "Indices" },
];

const WatchlistPage = () => {
  const { isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [debouncedCompanySearch, setDebouncedCompanySearch] = useState("");
  const [instrument, setInstrument] = useState<InstrumentTab>("stocks");
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesPages, setCompaniesPages] = useState(1);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [busySymbol, setBusySymbol] = useState<string | null>(null);

  const watchlistSymbols = useMemo(
    () => new Set(watchlist.map((item) => item.symbol)),
    [watchlist],
  );

  const loadWatchlist = async () => {
    if (!isAuthenticated) {
      setWatchlist([]);
      setAsOf(null);
      return;
    }

    setLoadingWatchlist(true);
    try {
      const response = await getUserWatchlist();
      setWatchlist(Array.isArray(response?.data) ? response.data : []);
      setAsOf(response?.as_of ? String(response.as_of).slice(0, 10) : null);
    } catch (error) {
      console.error("watchlist fetch failed", error);
      setWatchlist([]);
      setAsOf(null);
    } finally {
      setLoadingWatchlist(false);
    }
  };

  const loadCompanies = async (
    search = "",
    page = 1,
    nextInstrument: InstrumentTab = "stocks",
  ) => {
    setLoadingCompanies(true);
    try {
      const response = await getListedDailyData(
        "",
        page,
        40,
        search,
        nextInstrument,
        "listing",
      );

      const rows = Array.isArray(response?.listed_companies?.data)
        ? response.listed_companies.data
        : Array.isArray(response?.data)
          ? response.data
          : [];

      setAvailableCompanies(
        rows.map((company: any) => ({
          symbol: company.symbol,
          name: company.name || company.company_name || company.symbol,
          series: company.series,
          date_of_listing: company.date_of_listing,
          isin: company.isin,
          face_value: company.face_value,
          instrument: nextInstrument,
        })),
      );
      setCompaniesTotal(Number(response?.listed_companies?.total || rows.length));
      setCompaniesPage(Number(response?.listed_companies?.page || page));
      setCompaniesPages(Number(response?.listed_companies?.pages || 1) || 1);
    } catch (error) {
      console.error("listed companies fetch failed", error);
      setAvailableCompanies([]);
      setCompaniesTotal(0);
      setCompaniesPages(1);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCompanySearch(companySearch.trim());
      setCompaniesPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [companySearch]);

  useEffect(() => {
    if (!showAddModal) return;
    loadCompanies(debouncedCompanySearch, companiesPage, instrument);
  }, [showAddModal, debouncedCompanySearch, companiesPage, instrument]);

  const filteredWatchlist = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return watchlist;
    return watchlist.filter((item) => {
      const value = `${item.name || ""} ${item.symbol || ""}`.toLowerCase();
      return value.includes(q);
    });
  }, [watchlist, searchQuery]);

  const handleAdd = async (company: Company) => {
    if (!isAuthenticated || busySymbol) return;
    if (watchlistSymbols.has(company.symbol)) return;

    setBusySymbol(company.symbol);
    try {
      await addToWatchlist(company.symbol);
      await loadWatchlist();
    } catch (error) {
      console.error("add to watchlist failed", error);
    } finally {
      setBusySymbol(null);
    }
  };

  const handleRemove = async (symbol: string) => {
    if (!isAuthenticated || busySymbol) return;
    setBusySymbol(symbol);
    try {
      await removeFromWatchlist(symbol);
      await loadWatchlist();
    } catch (error) {
      console.error("remove from watchlist failed", error);
    } finally {
      setBusySymbol(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setCompanySearch("");
    setDebouncedCompanySearch("");
    setInstrument("stocks");
    setCompaniesPage(1);
  };

  const formatVolume = (volume?: number | null): string => {
    if (volume === null || volume === undefined) return "-";
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(1)}Cr`;
    if (volume >= 1e5) return `${(volume / 1e5).toFixed(1)}L`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return String(volume);
  };

  const formatPrice = (value?: number | null): string => {
    if (value === null || value === undefined) return "-";
    return `₹${Number(value).toFixed(2)}`;
  };

  const formatSymbol = (symbol?: string) =>
    symbol?.replace(/\.NS$/i, "") || "-";

  const formatListingDate = (value?: string | null) => {
    if (!value) return "-";
    return String(value).slice(0, 10);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={!isAuthenticated}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isAuthenticated ? "Add Stock" : "Login to Add"}
        </button>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      {loadingWatchlist ? (
        <PageLoader inline message="Loading watchlist…" />
      ) : filteredWatchlist.length > 0 ? (
        <section className="overflow-hidden rounded-xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Series</th>
                  <th className="px-4 py-3 text-right">Close</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWatchlist.map((item) => {
                  const close = item.latest?.close;
                  const prev = item.latest?.previous_close ?? item.latest?.open;
                  const volume = item.latest?.volume;
                  const change =
                    close != null && prev != null ? close - prev : null;
                  const changePercent =
                    change != null && prev ? (change / prev) * 100 : null;
                  const up = change == null ? true : change >= 0;

                  return (
                    <tr
                      key={item.symbol}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-slate-900">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatSymbol(item.symbol)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.series || item.sector || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatPrice(close)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${
                          change == null
                            ? "text-slate-500"
                            : up
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {change == null ? (
                          "-"
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {up ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {`${up ? "+" : ""}${change.toFixed(2)} (${
                              changePercent != null
                                ? `${up ? "+" : ""}${changePercent.toFixed(2)}%`
                                : "-"
                            })`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatVolume(volume)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.symbol)}
                          disabled={busySymbol === item.symbol}
                          className="inline-flex items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {asOf ? (
            <div className="border-t px-4 py-2 text-xs text-slate-500">
              Prices as of {asOf}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <Star className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">
            {searchQuery ? "No stocks found" : "Your watchlist is empty"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Add stocks here or from Listed Companies."}
          </p>
          {!searchQuery && isAuthenticated ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Your First Stock
            </button>
          ) : null}
        </section>
      )}

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Add Stock to Watchlist
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Browse listed companies like the market instruments page
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 border-b border-slate-100 px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search symbol or name"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setInstrument(tab.id);
                        setCompaniesPage(1);
                      }}
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
                <p className="text-xs text-slate-500">
                  {companiesTotal.toLocaleString()}{" "}
                  {instrument === "etfs"
                    ? "ETFs"
                    : instrument === "indices"
                      ? "indices"
                      : "companies"}
                  {watchlist.length
                    ? ` · ${watchlist.length} in watchlist`
                    : ""}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {loadingCompanies ? (
                <div className="px-5 py-10">
                  <PageLoader inline message="Loading companies…" />
                </div>
              ) : availableCompanies.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  No matching companies found.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Symbol</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">
                        {instrument === "indices" ? "Category" : "Series"}
                      </th>
                      {instrument === "stocks" ? (
                        <th className="px-3 py-2 text-left font-medium">
                          Listing
                        </th>
                      ) : null}
                      <th className="px-3 py-2 text-center font-medium">Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableCompanies.map((company) => {
                      const alreadyAdded = watchlistSymbols.has(company.symbol);
                      const busy = busySymbol === company.symbol;

                      return (
                        <tr
                          key={`${company.instrument || instrument}-${company.symbol}`}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-3 py-1.5 font-medium text-slate-900">
                            {formatSymbol(company.symbol)}
                          </td>
                          <td className="max-w-[280px] truncate px-3 py-1.5 text-slate-700">
                            {company.name}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {company.series || "-"}
                          </td>
                          {instrument === "stocks" ? (
                            <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                              {formatListingDate(company.date_of_listing)}
                            </td>
                          ) : null}
                          <td className="px-3 py-1.5 text-center">
                            {alreadyAdded ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <Check className="h-3 w-3" />
                                Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdd(company)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>
                  Page {companiesPage}/{companiesPages || 1}
                </span>
                <button
                  type="button"
                  disabled={companiesPage <= 1 || loadingCompanies}
                  onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={
                    companiesPage >= companiesPages || loadingCompanies
                  }
                  onClick={() =>
                    setCompaniesPage((p) =>
                      Math.min(companiesPages || 1, p + 1),
                    )
                  }
                  className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WatchlistPage;
