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
  } = useMarketSignalsData();
  const { role } = useAuth();
  const canUseMyScan = hasMasterAccess(role);

  const [tab, setTab] = useState<FormulaTab>("default");
  const [prefs, setPrefs] = useState<FormulaPrefs>({ favorites: [], pinned: [] });
  const [formulaSearch, setFormulaSearch] = useState("");
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
    () => orderFormulas(FORMULA_CATALOG, prefs, formulaSearch),
    [prefs, formulaSearch]
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

  if (loading && !data.length && !columns && tab === "default" && !customView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <PageLoader inline message="Loading formulas…" />
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
            <h1 className="text-2xl font-bold text-slate-900">Formula Signals</h1>
            <p className="mt-1 text-sm text-slate-500">
              Switch between system defaults and your custom formulas.
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
              <TabsTrigger value="default">Default</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Default formulas
                    </h2>
                    <p className="text-sm text-slate-500">
                      Built-in market signal formulas (buy day, FTD, gaps, and more).
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-600">
                        Search formulas
                      </label>
                      <Input
                        value={formulaSearch}
                        onChange={(e) => setFormulaSearch(e.target.value)}
                        placeholder="Type to filter…"
                        className="w-[220px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-600">
                        Formula
                      </label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={activeFormula}
                          onValueChange={setSelectedFilters}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Select a formula" />
                          </SelectTrigger>
                          <SelectContent>
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
                          title="Pin formula"
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
                          title="Favorite formula"
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
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">
                            Change order
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
                      </>
                    )}
                  </div>
                </div>

                {tradeDate ? (
                  <p className="text-xs text-slate-500">
                    Trade date:{" "}
                    <span className="font-medium text-slate-800">
                      {String(tradeDate).slice(0, 10)}
                    </span>
                  </p>
                ) : null}

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
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {customView?.title || "Custom formulas"}
                </h2>
                <p className="text-sm text-slate-500">
                  Build and run your own formula, then export the result table.
                </p>
              </div>

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
                  Run a custom formula above to see results here.
                </div>
              )}
            </TabsContent>

            {canUseMyScan ? (
              <TabsContent value="my-scan" className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">My Scan</h2>
                  <p className="text-sm text-slate-500">
                    Save the current formula filters and get Email or WhatsApp alerts.
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
