import Navigation from "@/components/Navigation";
import WatchlistPage from "@/components/screener/WatchlistPage";

export default function  Watchlist (){
 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              MarketView Watchlist
            </h1>
            <p className="text-slate-600 text-lg">
              Track your favorite stocks and monitor their performance
            </p>
          </div>
            {/* Market Overview */}
            <WatchlistPage />
        </div>
      </main>
    </div>
  );
}