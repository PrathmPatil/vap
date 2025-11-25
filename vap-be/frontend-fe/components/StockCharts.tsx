"use client";

import { BhavcopyTable } from "./BhavcopyTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { TrendingUp, BarChart3 } from "lucide-react";
import dynamic from "next/dynamic";

// Chart components - dynamically imported to disable SSR
const LineChartJS = dynamic(() => import("./charts/LineChartComponent"), {
  ssr: false,
});
const BarChartJS = dynamic(() => import("./charts/BarChartComponent"), {
  ssr: false,
});
const PieChartJS = dynamic(() => import("./charts/PieChartComponent"), {
  ssr: false,
});
const MasterChart = dynamic(() => import("./charts/MasterChart"), { ssr: false });


interface StockData {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dividends: number;
  stock_splits: number;
}

export function StockCharts({
  data,
  selectedSymbol,
  loading = false,
  dynamicURL,
  columns,
}: {
  data: StockData[];
  selectedSymbol: string;
  loading: boolean;
  dynamicURL?: string;
  columns?:any [];
}) {
  // Labels = Dates
  const labels = data.map((item) =>
    new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  );

  // Price Data
  const prices = data.map((item) => Number(item.close));

  // Volume Data
  const volumes = data.map((item) => Number(item.volume));

  // Portfolio breakdown (example: based on min/max/avg — replace with real distribution if available)
  const portfolioLabels = ["Open", "High", "Low", "Close"];
  const portfolioValues =
    data.length > 0
      ? [
          Number(data[data.length - 1].open),
          Number(data[data.length - 1].high),
          Number(data[data.length - 1].low),
          Number(data[data.length - 1].close),
        ]
      : [];

  // Current price info
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const previousPrice =
    prices.length > 1 ? prices[prices.length - 2] : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent =
    previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

    const portfolioData = {
    labels: ["Stocks", "Bonds", "Cash", "Crypto"],
    datasets: [
      {
        label: "Portfolio Breakdown",
        data: [40, 25, 20, 15],
        backgroundColor: ["#36A2EB", "#FFCE56", "#4BC0C0", "#FF6384"]
      }
    ]
  };

  const volumeData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        label: "Volume",
        data: [1200, 1900, 3000, 500, 2000],
        backgroundColor: "rgba(75,192,192,0.6)"
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Custom Chart" }
    }
  };

  return (
    <section id="charts" className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Stock Performance
        </h2>
        <p className="text-slate-600">Interactive charts and price analysis</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Summary Card */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>{selectedSymbol}</span>
              </div>
            </CardTitle>
            <CardDescription>Current market data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : (
              <>
                {/* Price */}
                <div>
                  <div className="text-3xl font-bold text-slate-900">
                    ₹{currentPrice.toFixed(2)}
                  </div>
                  <div
                    className={`flex items-center space-x-1 text-sm ${
                      priceChange >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <span>
                      {priceChange >= 0 ? "+" : ""}₹{priceChange.toFixed(2)}
                    </span>
                    <span>
                      ({priceChange >= 0 ? "+" : ""}
                      {priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* High/Low/Volume */}
                {data.length > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">High:</span>
                      <span className="font-medium">
                        ₹{Math.max(...data.map((d) => d.high)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Low:</span>
                      <span className="font-medium">
                        ₹{Math.min(...data.map((d) => d.low)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Volume:</span>
                      <span className="font-medium">
                        {volumes[volumes.length - 1]?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Price Chart Card */}
        <Card className="lg:col-span-2 h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Price Chart</span>
            </CardTitle>
            <CardDescription>Price movement over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <LineChartJS labels={labels} dataPoints={prices} label="Stocks Price" optionsTitle="Stock price over time"/>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span>Volume Analysis</span>
            </CardTitle>
            <CardDescription>Trading volume over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <BarChartJS labels={labels} dataPoints={volumes} label="Stocks" optionsTitle="Volume Analysis" />
            )}
          </CardContent>
        </Card>

        {/* Portfolio Breakdown */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span>Portfolio Breakdown</span>
            </CardTitle>
            <CardDescription>Distribution of stock attributes</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex justify-center">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <PieChartJS
                labels={portfolioLabels}
                dataPoints={portfolioValues}
                label="Portfolio Distribution"
                optionsTitle="Portfolio Allocation"
              />
            )}
          </CardContent>
        </Card>
      </div>
      <BhavcopyTable
        dynamicURL={dynamicURL || ""}
        title={""}
        description={""}
        columns={columns || []}
      />
    </section>
  );
}
