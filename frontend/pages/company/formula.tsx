import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import CommonTable from "@/components/ui/common-table";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { PageLoader } from "@/components/ui/PageLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarketSignalsData } from "@/hooks/use-market-formulas";
import {
  FORMULA_CATALOG,
  loadFormulaPrefs,
  orderFormulas,
  saveFormulaPrefs,
  type FormulaPrefs,
} from "@/lib/formulaCatalog";
import { Pin, Star } from "lucide-react";
import CustomFormulaPanel from "@/components/CustomFormulaPanel";
import MyScanPanel from "@/components/MyScanPanel";
import { exportRowsToCsv } from "@/lib/exportData";
import { useAuth } from "@/context/AuthContext";
import { hasMasterAccess } from "@/lib/authRoles";
import { useRouter } from "next/router";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import RsRankConfirmationPanel, {
  type RsRankConfirmation,
  type RsRunMeta,
} from "@/components/RsRankConfirmationPanel";

function slugForFilename(value: string) {
  return (
    String(value || "formula")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "formula"
  );
}

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

type FormulaTab = "default" | "custom" | "my-scan";

export default function Home() {
  const {
    data,
    columns,
    selectedFilters,
    setSelectedFilters,
    loading,
    error,
    itemsPerPage,
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
    setItemsPerPage,
    changePercentMin,
    setChangePercentMin,
    changePercentMax,
    setChangePercentMax,
    changeSort,
    setChangeSort,
    usesChangePercent,
    bodyPercent,
    setBodyPercent,
    volumeRatioMin,
    setVolumeRatioMin,
    minRsRank,
    setMinRsRank,
    usesBodyPercent,
    usesVolumeRatio,
    usesRsRankFilter,
    usesSortControls,
    rsRunMeta,
    rsConfirmation,
    rsFormulaDates,
    selectedSymbol,
  } = useMarketSignalsData();
  const router = useRouter();
  const { role, authLoading, isAuthenticated, isSubscribed } = useAuth();
  const canUseMyScan = hasMasterAccess(role);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isSubscribed) {
      router.replace("/subscription");
    }
  }, [authLoading, isAuthenticated, isSubscribed, router]);

  const [tab, setTab] = useState<FormulaTab>("default");
  const [prefs, setPrefs] = useState<FormulaPrefs>({ favorites: [], pinned: [] });
  const [customView, setCustomView] = useState<{
    columns: any[];
    data: any[];
    totalPages: number;
    totalItems: number;
    title: string;
    formulaName?: string;
    asOf?: string;
  } | null>(null);

  useEffect(() => {
    setPrefs(loadFormulaPrefs());
  }, []);

  useEffect(() => {
    if (!canUseMyScan && tab === "my-scan") {
      setTab("default");
    }
  }, [canUseMyScan, tab]);

  const orderedFormulas = useMemo(
    () => orderFormulas(FORMULA_CATALOG, prefs),
    [prefs]
  );

  const activeFormula = selectedFilters[0] || "";

  const togglePinned = (value: string) => {
    setPrefs((prev) => {
      const pinned = prev.pinned.includes(value)
        ? prev.pinned.filter((v) => v !== value)
        : [value, ...prev.pinned.filter((v) => v !== value)];
      const next = { ...prev, pinned };
      saveFormulaPrefs(next);
      return next;
    });
  };

  const toggleFavorite = (value: string) => {
    setPrefs((prev) => {
      const favorites = prev.favorites.includes(value)
        ? prev.favorites.filter((v) => v !== value)
        : [value, ...prev.favorites.filter((v) => v !== value)];
      const next = { ...prev, favorites };
      saveFormulaPrefs(next);
      return next;
    });
  };

  if (
    (loading && !data.length && !columns && tab === "default" && !customView) ||
    authLoading ||
    !isAuthenticated ||
    !isSubscribed
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <PageLoader inline message="Loading Premium Scanner…" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Premium Scanner
              </h1>
              <Badge className="border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
                <Crown className="mr-1 h-3.5 w-3.5" />
                Premium
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Run system scanners or your custom screens on NSE/BSE data.
            </p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as FormulaTab)}
            className="space-y-6"
          >
            <TabsList
              className={`grid w-full ${
                canUseMyScan ? "max-w-xl grid-cols-3" : "max-w-md grid-cols-2"
              }`}
            >
              <TabsTrigger value="default">Premium scanners</TabsTrigger>
              <TabsTrigger value="custom">Custom scanners</TabsTrigger>
              {canUseMyScan ? (
                <TabsTrigger value="my-scan">My Scan</TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="default" className="space-y-6">
              <div
                className={
                  loading ? "pointer-events-none space-y-6 opacity-50" : "space-y-6"
                }
              >
                <div className="space-y-3">
                  {tradeDate ? (
                    <p className="text-base font-semibold tabular-nums tracking-tight text-slate-900">
                      {formatTradeDate(tradeDate)}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-600">
                        Scanner
                      </label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={activeFormula}
                          onValueChange={setSelectedFilters}
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select a scanner" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
                            {orderedFormulas.map((formula) => (
                              <SelectItem key={formula.value} value={formula.value}>
                                {(prefs.pinned.includes(formula.value)
                                  ? "📌 "
                                  : "") +
                                  (prefs.favorites.includes(formula.value)
                                    ? "★ "
                                    : "") +
                                  formula.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Pin scanner"
                          onClick={() =>
                            activeFormula && togglePinned(activeFormula)
                          }
                          disabled={!activeFormula}
                        >
                          <Pin
                            className={`h-4 w-4 ${
                              prefs.pinned.includes(activeFormula)
                                ? "fill-slate-900 text-slate-900"
                                : ""
                            }`}
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Favorite scanner"
                          onClick={() =>
                            activeFormula && toggleFavorite(activeFormula)
                          }
                          disabled={!activeFormula}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              prefs.favorites.includes(activeFormula)
                                ? "fill-amber-400 text-amber-500"
                                : ""
                            }`}
                          />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-600">
                        Company
                      </label>
                      <Select
                        value={selectedSymbol || "all"}
                        onValueChange={setSelectedSymbol}
                      >
                        <SelectTrigger className="w-[260px]">
                          <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All companies</SelectItem>
                          {companies.map((company) => (
                            <SelectItem
                              key={company.symbol}
                              value={company.symbol}
                            >
                              {company.label || company.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(activeFormula === "strong-bullish-candle" ||
                      activeFormula === "strong-king-candle" ||
                      activeFormula === "bearish-candle" ||
                      activeFormula === "gap-up-day" ||
                      activeFormula === "gap-down-day" ||
                      activeFormula === "top-gainer-day" ||
                      activeFormula === "top-loser-day" ||
                      activeFormula === "daily-mover-up" ||
                      activeFormula === "daily-mover-down") && (
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
                            const nextValue = Number(e.target.value);
                            setBasePercent(nextValue);
                            handleSearch(searchTerm, nextValue);
                          }}
                        />
                      </div>
                    )}

                    {usesBodyPercent && (
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
                          onChange={(e) =>
                            setBodyPercent(Number(e.target.value))
                          }
                        />
                      </div>
                    )}

                    {usesVolumeRatio && (
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
                          onChange={(e) =>
                            setVolumeRatioMin(Number(e.target.value))
                          }
                        />
                      </div>
                    )}

                    {usesRsRankFilter && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">
                          Min RS rank
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          step={1}
                          className="w-[120px]"
                          value={minRsRank}
                          onChange={(e) => setMinRsRank(e.target.value)}
                          placeholder="e.g. 80"
                        />
                      </div>
                    )}

                    {usesChangePercent && (
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
                            placeholder="Low/high"
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
                            placeholder="High/low"
                          />
                        </div>
                      </>
                    )}

                    {usesSortControls && (
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
                    )}
                  </div>

                  {activeFormula === "rs-rank" ? (
                    <>
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <strong>IBD-style RS Rank</strong> — uses the stock&apos;s
                        own price returns over ~3M, 6M, 9M, and 12M (63/126/189/252
                        sessions). RS Score ={" "}
                        <code>(2×Q1 + Q2 + Q3 + Q4) / 5</code>. Rank 1–99 is the
                        percentile versus all NSE EQ stocks with full history — not
                        vs Nifty.
                      </p>
                      <RsRankConfirmationPanel
                        runMeta={rsRunMeta as RsRunMeta | null}
                        confirmation={rsConfirmation as RsRankConfirmation | null}
                        formulaDates={rsFormulaDates as RsRankConfirmation | null}
                        loading={loading}
                        selectedSymbol={selectedSymbol || ""}
                        companyHint="Select a company to compare its session dates vs the reference row above."
                      />
                    </>
                  ) : null}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                    {error}
                  </div>
                )}

                <CommonTable
                  data={data}
                  columns={columns}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  pageSizeMin={1}
                  pageSizeMax={50}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  showSearch={true}
                  onSearch={(term) => handleSearch(term, basePercent)}
                  searchTerm={searchTerm}
                  searchPlaceholder="Search symbol or company..."
                  showExport={true}
                  exportLabel="Export Excel"
                  onExport={handleExport}
                  loading={loading}
                  totalPages={totalPages}
                  totalItems={totalItems}
                />
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <CustomFormulaPanel
                onRunResults={(payload) => {
                  setCustomView(payload);
                  setCurrentPage(1);
                  setTab("custom");
                }}
              />

              {customView ? (
                <CommonTable
                  data={customView.data}
                  columns={customView.columns}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
                  pageSizeMin={1}
                  pageSizeMax={50}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  showSearch={false}
                  showExport={true}
                  onExport={() => {
                    const namePart = slugForFilename(
                      customView.formulaName ||
                        customView.title ||
                        "custom-formula"
                    );
                    const datePart = slugForFilename(
                      (
                        customView.asOf ||
                        new Date().toISOString().slice(0, 10)
                      ).slice(0, 10)
                    );
                    exportRowsToCsv(
                      customView.data as Record<string, unknown>[],
                      {
                        columns: customView.columns?.map((col) => ({
                          key: col.key,
                          label: col.label,
                        })),
                        filename: `${namePart}_${datePart}.csv`,
                      }
                    );
                  }}
                  loading={false}
                  totalPages={customView.totalPages}
                  totalItems={customView.totalItems}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center text-sm text-slate-500">
                  Run a custom scanner above to see results here.
                </div>
              )}
            </TabsContent>

            {canUseMyScan ? (
              <TabsContent value="my-scan" className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">My Scan</h2>
                  <p className="text-sm text-slate-500">
                    Save the current scanner filters and get Email or WhatsApp alerts.
                  </p>
                </div>
                <MyScanPanel
                  formulaType={activeFormula || "strong-bullish-candle"}
                  basePercent={basePercent}
                  changePercentMin={changePercentMin}
                  changePercentMax={changePercentMax}
                  changeSort={changeSort}
                  selectedSymbol={selectedSymbol}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
