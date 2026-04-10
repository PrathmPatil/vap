import Navigation from "@/components/Navigation";
import MarketSignalsPage from "@/components/MarketSignals";
import CommonTable from "@/components/ui/common-table";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  } = useMarketSignalsData();

  // Loading UI
  if (loading) {
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

  const renderCustomFilter = () => {
    if (selectedFilters[0] === "buy_day") {
      return <div className="mb-6 flex items-center justify-end gap-4"></div>;
    } else if (selectedFilters[0] === "strong-bullish-candle") {
      return (
        <div className="mb-6 flex items-center justify-end gap-4">
          <label htmlFor="basePercent" className="mr-2 font-medium">
            Base Percent:
          </label>
          <input
            type="number"
            id="basePercent"
            className="border border-gray-300 rounded-md px-2 py-1"
            value={basePercent}
            onChange={(e) => {
              handleSearch(searchTerm, Number(e.target.value));
              setBasePercent(Number(e.target.value));
            }}
          />
        </div>
      );
    }
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${
        loading ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          {/* Filter Section */}
          <div className="mb-6 flex items-center justify-end gap-4">
            <Select
              value={selectedFilters[0] || ""}
              onValueChange={(value) => setSelectedFilters([value])}
            >
              <SelectTrigger className="w-[250px]">
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
                <SelectItem value="volume-breakouts">Volume Breakouts</SelectItem>
                <SelectItem value="tweezer-bottoms">Tweezer Bottoms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderCustomFilter()}
          {error && (
            <div className="mb-4 text-red-500">
              Failed to load data. Please try again later.
            </div>
          )}
          <CommonTable
            data={data}
            columns={columns}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            showSearch={true}
            onSearch={(searchTerm) => handleSearch(searchTerm, basePercent)}
            searchTerm={searchTerm}
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
