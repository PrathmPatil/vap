import Navigation from "@/components/Navigation";
import WatchlistPage from "@/components/screener/WatchlistPage";

export default function Watchlist() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Watchlist</h1>
          <p className="text-slate-600">
            Track your favorite stocks and monitor their latest prices
          </p>
        </div>
        <WatchlistPage />
      </main>
    </div>
  );
}
