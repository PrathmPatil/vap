import MarketSignalsPage from "@/components/MarketSignals";
import Navigation from "@/components/Navigation";
import CommonTable from "@/components/ui/common-table";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketSignalsData } from "@/hooks/use-market-formulas";
import { SelectContent } from "@radix-ui/react-select";

export default function Home() {
  const { data, selectedFilters, setSelectedFilters, loading, error, itemsPerPage, setItemsPerPage, currentPage, setCurrentPage } =
    useMarketSignalsData();
  

      if (loading) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
             <Navigation />
            <main className="container mx-auto px-4 py-8">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-96" />
              </div>
            </main>
          </div>
        );
      }
  return (
    <div
      className={`flex flex-col min-h-screen ${loading ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-4 justify-end">
            <Select
              value={selectedFilters[0] || ""}
              onValueChange={(value) => setSelectedFilters([value])}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a formula" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="buy_day">Buy Day</SelectItem>
                <SelectItem value="follow_through_day">
                  Follow Through Day
                </SelectItem>
                <SelectItem value="rally_attempt_day">
                  Rally Attempt Day
                </SelectItem>
                <SelectItem value="strong_bullish_candle">
                  Strong Bullish Candle
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CommonTable data={data} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />

          <MarketSignalsPage />
        </main>
      </div>
    </div>
  );
}
