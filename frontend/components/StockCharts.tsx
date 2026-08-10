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
import { TrendingUp, BarChart3, Activity } from "lucide-react";
import dynamic from "next/dynamic";
import {
  bollingerBands,
  latestIndicatorSnapshot,
  obv,
  rsi,
  sma,
} from "@/lib/technicalIndicators";

const LineChartJS = dynamic(() => import("./charts/LineChartComponent"), {
  ssr: false,
});
const BarChartJS = dynamic(() => import("./charts/BarChartComponent"), {
  ssr: false,
});
const MultiLineChart = dynamic(() => import("./charts/MultiLineChart"), {
  ssr: false,
});

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

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
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
  columns?: any[];
}) {
  const labels = data.map((item) =>
    new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  );

  const prices = data.map((item) => Number(item.close));
  const volumes = data.map((item) => Number(item.volume));

  const ma20 = sma(prices, 20);
  const ma50 = sma(prices, 50);
  const ma100 = sma(prices, 100);
  const ma200 = sma(prices, 200);
  const bb = bollingerBands(prices, 20, 2);
  const rsi14 = rsi(prices, 14);
  const obvSeries = obv(prices, volumes);
  const snapshot = latestIndicatorSnapshot(prices, volumes);

  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const previousPrice =
    prices.length > 1 ? prices[prices.length - 2] : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent =
    previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

  return (
    <section id="charts" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Stock Performance
        </h2>
        <p className="text-slate-600">
          Price, volume, and technical indicators
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <Card className="lg:col-span-2 h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Price + Moving Averages / Bollinger</span>
            </CardTitle>
            <CardDescription>
              Close with MA 20/50/100/200 and Bollinger Bands
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[380px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <MultiLineChart
                labels={labels}
                optionsTitle={`${selectedSymbol} price & indicators`}
                datasets={[
                  {
                    label: "Close",
                    data: prices,
                    borderColor: "rgb(37, 99, 235)",
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                    fill: false,
                  },
                  {
                    label: "MA 20",
                    data: ma20,
                    borderColor: "rgb(234, 179, 8)",
                  },
                  {
                    label: "MA 50",
                    data: ma50,
                    borderColor: "rgb(249, 115, 22)",
                  },
                  {
                    label: "MA 100",
                    data: ma100,
                    borderColor: "rgb(168, 85, 247)",
                  },
                  {
                    label: "MA 200",
                    data: ma200,
                    borderColor: "rgb(15, 118, 110)",
                  },
                  {
                    label: "BB Upper",
                    data: bb.upper,
                    borderColor: "rgba(100, 116, 139, 0.7)",
                    borderDash: [4, 4],
                  },
                  {
                    label: "BB Middle",
                    data: bb.middle,
                    borderColor: "rgba(100, 116, 139, 0.9)",
                    borderDash: [2, 2],
                  },
                  {
                    label: "BB Lower",
                    data: bb.lower,
                    borderColor: "rgba(100, 116, 139, 0.7)",
                    borderDash: [4, 4],
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <span>Latest Indicators</span>
          </CardTitle>
          <CardDescription>
            RSI(14), OBV, Bollinger, and configurable MAs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8 text-sm">
              {(
                [
                  ["RSI 14", snapshot.rsi14, 2],
                  ["OBV", snapshot.obv, 0],
                  ["BB Upper", snapshot.bbUpper, 2],
                  ["BB Mid", snapshot.bbMiddle, 2],
                  ["BB Lower", snapshot.bbLower, 2],
                  ["MA 20", snapshot.ma20, 2],
                  ["MA 50", snapshot.ma50, 2],
                  ["MA 100", snapshot.ma100, 2],
                  ["MA 200", snapshot.ma200, 2],
                ] as const
              ).map(([label, value, digits]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-semibold text-slate-900">
                    {fmt(value, digits)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>RSI (14)</CardTitle>
            <CardDescription>Relative Strength Index</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <LineChartJS
                labels={labels}
                dataPoints={rsi14.map((v) => (v == null ? 0 : v))}
                label="RSI 14"
                optionsTitle="RSI (14)"
              />
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>On-Balance Volume</CardTitle>
            <CardDescription>Cumulative volume pressure</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <BarChartJS
                labels={labels}
                dataPoints={obvSeries.map((v) => (v == null ? 0 : v))}
                label="OBV"
                optionsTitle="On-Balance Volume"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <BarChartJS
                labels={labels}
                dataPoints={volumes}
                label="Volume"
                optionsTitle="Volume Analysis"
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
