import Navigation from "@/components/Navigation";
import CommonTable from "@/components/ui/common-table";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useMarketSignalsData } from "@/hooks/use-market-formulas";

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
    selectedDate,
    setSelectedDate,
    selectedSymbol,
    setSelectedSymbol,
    availableDates,
    datesLoaded,
    companies,
    tradeDate,
  } = useMarketSignalsData();

  if (loading && !data.length && !columns) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col min-h-screen ${
        loading ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Formula Signals
              </h1>
              {tradeDate && (
                <p className="mt-1 text-sm text-slate-500">
                  Showing data for trade date:{" "}
                  <span className="font-medium text-slate-700">{tradeDate}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Formula
                </label>
                <Select
                  value={selectedFilters[0] || ""}
                  onValueChange={setSelectedFilters}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select a formula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy-day">Buy Day</SelectItem>
                    <SelectItem value="follow-through-day">
                      Follow Through Day
                    </SelectItem>
                    <SelectItem value="rally-attempt-day">
                      Rally Attempt Day
                    </SelectItem>
                    <SelectItem value="strong-bullish-candle">
                      Strong Bullish Candle
                    </SelectItem>
                    <SelectItem value="bearish-candle">Bearish Candle</SelectItem>
                    <SelectItem value="gap-up-day">Gap Up Day</SelectItem>
                    <SelectItem value="gap-down-day">Gap Down Day</SelectItem>
                    <SelectItem value="fifty-two-week-high">
                      52-Week High Breakout
                    </SelectItem>
                    <SelectItem value="top-gainer-day">Top Gainer Day</SelectItem>
                    <SelectItem value="top-loser-day">Top Loser Day</SelectItem>
                    <SelectItem value="band-hit-52w">52W Band Hit</SelectItem>
                    <SelectItem value="fifty-two-week-low">
                      52-Week Low Breakdown
                    </SelectItem>
                    <SelectItem value="daily-mover-up">Daily Mover Up</SelectItem>
                    <SelectItem value="daily-mover-down">Daily Mover Down</SelectItem>
                    <SelectItem value="volume-breakouts">
                      Volume Breakouts
                    </SelectItem>
                    <SelectItem value="tweezer-bottoms">
                      Tweezer Bottoms
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">
                  Trade Date
                </label>
                {datesLoaded && availableDates.length === 0 ? (
                  <div className="flex h-10 w-[180px] items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm text-amber-700">
                    No date available
                  </div>
                ) : (
                  <Select
                    value={selectedDate || ""}
                    onValueChange={setSelectedDate}
                    disabled={!availableDates.length}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue
                        placeholder={
                          datesLoaded ? "Select date" : "Loading dates..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                      <SelectItem key={company.symbol} value={company.symbol}>
                        {company.label || company.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedFilters[0] === "strong-bullish-candle" ||
                selectedFilters[0] === "bearish-candle") && (
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="basePercent"
                    className="text-xs font-medium text-slate-600"
                  >
                    Base Percent
                  </label>
                  <Input
                    id="basePercent"
                    type="number"
                    min={2}
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

              {(selectedFilters[0] === "gap-up-day" ||
                selectedFilters[0] === "gap-down-day") && (
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="gapThreshold"
                    className="text-xs font-medium text-slate-600"
                  >
                    Gap Threshold %
                  </label>
                  <Input
                    id="gapThreshold"
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

              {(selectedFilters[0] === "top-gainer-day" ||
                selectedFilters[0] === "top-loser-day" ||
                selectedFilters[0] === "daily-mover-up" ||
                selectedFilters[0] === "daily-mover-down") && (
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="minPercent"
                    className="text-xs font-medium text-slate-600"
                  >
                    Min Move %
                  </label>
                  <Input
                    id="minPercent"
                    type="number"
                    min={1}
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
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
              {error}
            </div>
          )}

          <CommonTable
            data={data}
            columns={columns}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            showSearch={true}
            onSearch={(term) => handleSearch(term, basePercent)}
            searchTerm={searchTerm}
            searchPlaceholder="Search symbol or company..."
            showExport={true}
            onExport={handleExport}
            loading={loading}
            onRowClick={(row) => console.log("Clicked:", row)}
            totalPages={totalPages}
            totalItems={totalItems}
          />
        </main>
      </div>
    </div>
  );
}
