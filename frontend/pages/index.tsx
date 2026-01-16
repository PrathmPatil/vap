import Image from "next/image";
// import { Geist, Geist_Mono } from "next/font/google";
import  Navigation  from "@/components/Navigation";
import { MarketOverview } from "@/components/MarketOverview";
// import { StockCharts } from "@/components/StockCharts";
import { CompaniesTable } from "@/components/CompaniesTable";
import { FailedSymbols } from "@/components/FailedSymbols";


export default function Home() {
  return (
    // <div
    //   className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20`}
    // >
    // </div>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Stock Market Dashboard
            </h1>
            <p className="text-slate-600 text-lg">
              Real-time market analysis and company insights
            </p>
          </div>

          {/* Market Overview */}
          <MarketOverview />

          {/* Stock Charts */}
          {/* <StockCharts /> */}

          {/* Companies Table */}
          <CompaniesTable />

          {/* Failed Symbols */}
          <FailedSymbols />
        </div>
      </main>
    </div>
  );
}
