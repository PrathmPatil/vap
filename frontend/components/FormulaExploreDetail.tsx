"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CommonTable from "@/components/ui/common-table";
import { PageLoader } from "@/components/ui/PageLoader";
import type { FormulaExploreItem } from "@/lib/formulaExploreCatalog";
import { Crown, Lock } from "lucide-react";

type FormulaExploreDetailProps = {
  item: FormulaExploreItem;
  canViewResults: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  tradeDate: string | null;
  loading: boolean;
  error: string | null;
  data: any[];
  columns: any;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  totalPages: number;
  totalItems: number;
  searchTerm: string;
  onSearch: (term: string, basePercent?: number) => void;
  onExport: () => void;
  basePercent: number;
  setBasePercent: (value: number) => void;
  bodyPercent?: number;
  setBodyPercent?: (value: number) => void;
  volumeRatioMin?: number;
  setVolumeRatioMin?: (value: number) => void;
  minRsRank?: string;
  setMinRsRank?: (value: string) => void;
  changePercentMin?: string;
  setChangePercentMin?: (value: string) => void;
  changePercentMax?: string;
  setChangePercentMax?: (value: string) => void;
  changeSort?: "asc" | "desc";
  setChangeSort?: (value: "asc" | "desc") => void;
  usesBodyPercent?: boolean;
  usesVolumeRatio?: boolean;
  usesRsRankFilter?: boolean;
  usesChangePercent?: boolean;
  usesSortControls?: boolean;
  selectedSymbol?: string;
  setSelectedSymbol?: (value: string) => void;
  companies?: { symbol: string; label?: string }[];
};

export default function FormulaExploreDetail({
  item,
  canViewResults,
  authLoading,
  isAuthenticated,
  tradeDate,
  loading,
  error,
  data,
  columns,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
  totalItems,
  searchTerm,
  onSearch,
  onExport,
  basePercent,
  setBasePercent,
  bodyPercent,
  setBodyPercent,
  volumeRatioMin,
  setVolumeRatioMin,
  minRsRank,
  setMinRsRank,
  changePercentMin,
  setChangePercentMin,
  changePercentMax,
  setChangePercentMax,
  changeSort,
  setChangeSort,
  usesBodyPercent,
  usesVolumeRatio,
  usesRsRankFilter,
  usesChangePercent,
  usesSortControls,
  selectedSymbol,
  setSelectedSymbol,
  companies = [],
}: FormulaExploreDetailProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{item.label}</h1>
              {item.premium ? (
                <Badge className="border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  Premium
                </Badge>
              ) : null}
            </div>
            {tradeDate ? (
              <p className="text-sm font-medium text-slate-600">
                As of{" "}
                {new Date(tradeDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700">
          {item.fullDescription}
        </p>

        <div className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            How it works
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {item.rules.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {!canViewResults && !authLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">
            Unlock live results
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Browse every scanner and its logic for free. Subscribe to run this
            screen and export matching stocks.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!isAuthenticated ? (
              <Button asChild>
                <Link href={`/login?returnUrl=${encodeURIComponent("/explore")}`}>
                  Log in to continue
                </Link>
              </Button>
            ) : (
              <Button asChild className="bg-amber-600 hover:bg-amber-700">
                <Link href="/subscription">Get Premium</Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {canViewResults ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            {companies.length > 0 && setSelectedSymbol ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Company
                </label>
                <Select
                  value={selectedSymbol || "all"}
                  onValueChange={setSelectedSymbol}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="All companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.symbol} value={company.symbol}>
                        {company.label || company.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {(item.value === "strong-bullish-candle" ||
              item.value === "strong-king-candle" ||
              item.value === "bearish-candle" ||
              item.value === "gap-up-day" ||
              item.value === "gap-down-day" ||
              item.value === "top-gainer-day" ||
              item.value === "top-loser-day" ||
              item.value === "daily-mover-up" ||
              item.value === "daily-mover-down") && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Threshold %
                </label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className="w-[120px]"
                  value={basePercent}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setBasePercent(next);
                    onSearch(searchTerm, next);
                  }}
                />
              </div>
            )}

            {usesBodyPercent && setBodyPercent ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Body % of range
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="w-[120px]"
                  value={bodyPercent}
                  onChange={(e) => setBodyPercent(Number(e.target.value))}
                />
              </div>
            ) : null}

            {usesVolumeRatio && setVolumeRatioMin ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Volume ratio (min)
                </label>
                <Input
                  type="number"
                  min={1}
                  step={0.1}
                  className="w-[120px]"
                  value={volumeRatioMin}
                  onChange={(e) => setVolumeRatioMin(Number(e.target.value))}
                />
              </div>
            ) : null}

            {usesRsRankFilter && setMinRsRank ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Min RS rank
                </label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="w-[120px]"
                  value={minRsRank}
                  onChange={(e) => setMinRsRank(e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
            ) : null}

            {usesChangePercent && setChangePercentMin && setChangePercentMax ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">
                    Change % from
                  </label>
                  <Input
                    type="number"
                    step={0.1}
                    className="w-[110px]"
                    value={changePercentMin}
                    onChange={(e) => setChangePercentMin(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">
                    Change % to
                  </label>
                  <Input
                    type="number"
                    step={0.1}
                    className="w-[110px]"
                    value={changePercentMax}
                    onChange={(e) => setChangePercentMax(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {usesSortControls && setChangeSort ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Sort order
                </label>
                <Select
                  value={changeSort}
                  onValueChange={(value) =>
                    setChangeSort(value as "asc" | "desc")
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">High to low</SelectItem>
                    <SelectItem value="asc">Low to high</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              {error}
            </div>
          ) : null}

          {loading && !data.length ? (
            <PageLoader inline message="Loading results…" />
          ) : (
            <CommonTable
              data={data}
              columns={columns}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              pageSizeMin={1}
              pageSizeMax={50}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              showSearch
              onSearch={(term) => onSearch(term, basePercent)}
              searchTerm={searchTerm}
              searchPlaceholder="Search symbol or company..."
              showExport
              exportLabel="Export Excel"
              onExport={onExport}
              loading={loading}
              totalPages={totalPages}
              totalItems={totalItems}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
