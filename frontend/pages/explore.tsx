"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation";
import FormulaExploreCatalog from "@/components/FormulaExploreCatalog";
import FormulaExploreDetail from "@/components/FormulaExploreDetail";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useMarketSignalsData } from "@/hooks/use-market-formulas";
import {
  FORMULA_EXPLORE_CATEGORIES,
  getFormulaExploreItem,
  searchExploreFormulas,
} from "@/lib/formulaExploreCatalog";
import { ArrowLeft, Crown, Search } from "lucide-react";

function formatTradeDate(value: string | null | undefined) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "";
  const [year, month, day] = raw.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExplorePage() {
  const router = useRouter();
  const { isAuthenticated, authLoading, isSubscribed } = useAuth();
  const [search, setSearch] = useState("");

  const queryScanner =
    typeof router.query.scanner === "string" ? router.query.scanner : "";

  const selectedItem = getFormulaExploreItem(queryScanner);
  const showDetail = Boolean(selectedItem);

  useEffect(() => {
    if (!router.isReady) return;
    if (queryScanner && !selectedItem) {
      router.replace("/explore", undefined, { shallow: true });
    }
  }, [router.isReady, queryScanner, selectedItem, router]);

  const canUseExplore = isSubscribed;

  const formulaHook = useMarketSignalsData({
    enabled: canUseExplore && showDetail,
  });

  const {
    selectedFilters,
    setSelectedFilters,
    data,
    columns,
    loading,
    error,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    handleSearch,
    searchTerm,
    handleExport,
    basePercent,
    setBasePercent,
    totalPages,
    totalItems,
    selectedSymbol,
    setSelectedSymbol,
    companies,
    tradeDate,
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
    usesChangePercent,
    usesBodyPercent,
    usesVolumeRatio,
    usesRsRankFilter,
    usesSortControls,
  } = formulaHook;

  const activeFormula = selectedFilters[0];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent("/explore")}`);
      return;
    }
    if (!isSubscribed) {
      router.replace("/subscription");
    }
  }, [authLoading, isAuthenticated, isSubscribed, router]);

  useEffect(() => {
    if (!router.isReady || !canUseExplore || !showDetail || !selectedItem) return;
    if (activeFormula === selectedItem.value) return;
    setSelectedFilters(selectedItem.value);
  }, [
    router.isReady,
    canUseExplore,
    showDetail,
    selectedItem,
    activeFormula,
    setSelectedFilters,
  ]);

  const filteredItems = useMemo(() => searchExploreFormulas(search), [search]);

  const grouped = useMemo(() => {
    return FORMULA_EXPLORE_CATEGORIES.map((category) => ({
      category,
      items: filteredItems.filter((item) => item.categoryId === category.id),
    })).filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const openScanner = (value: string) => {
    router.push(
      { pathname: "/explore", query: { scanner: value } },
      undefined,
      { shallow: true },
    );
  };

  const backToCatalog = () => {
    router.push("/explore", undefined, { shallow: true });
  };

  if (authLoading || !isAuthenticated || !isSubscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <PageLoader inline message="Loading explore…" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        {showDetail && selectedItem ? (
          <div className="space-y-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 pl-0 text-slate-600 hover:text-slate-900"
              onClick={backToCatalog}
            >
              <ArrowLeft className="h-4 w-4" />
              All stock screens
            </Button>

            <FormulaExploreDetail
              item={selectedItem}
              canViewResults
              authLoading={false}
              isAuthenticated
              tradeDate={tradeDate}
              loading={loading}
              error={error}
              data={data}
              columns={columns}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              searchTerm={searchTerm}
              onSearch={handleSearch}
              onExport={handleExport}
              basePercent={basePercent}
              setBasePercent={setBasePercent}
              bodyPercent={bodyPercent}
              setBodyPercent={setBodyPercent}
              volumeRatioMin={volumeRatioMin}
              setVolumeRatioMin={setVolumeRatioMin}
              minRsRank={minRsRank}
              setMinRsRank={setMinRsRank}
              changePercentMin={changePercentMin}
              setChangePercentMin={setChangePercentMin}
              changePercentMax={changePercentMax}
              setChangePercentMax={setChangePercentMax}
              changeSort={changeSort}
              setChangeSort={setChangeSort}
              usesBodyPercent={usesBodyPercent}
              usesVolumeRatio={usesVolumeRatio}
              usesRsRankFilter={usesRsRankFilter}
              usesChangePercent={usesChangePercent}
              usesSortControls={usesSortControls}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={setSelectedSymbol}
              companies={companies}
            />

            {tradeDate ? (
              <p className="text-center text-xs text-slate-500">
                Results for {formatTradeDate(tradeDate)} ·{" "}
                <Link
                  href="/company/formula"
                  className="text-indigo-600 hover:underline"
                >
                  Open in Premium Scanner
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                    Stock screens
                  </p>
                  <Badge className="border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    Premium
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Explore scanners
                </h1>
              </div>

              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search screens…"
                  className="pl-9"
                />
              </div>
            </div>

            <FormulaExploreCatalog grouped={grouped} onSelect={openScanner} />
          </>
        )}
      </main>
    </div>
  );
}
