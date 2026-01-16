"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function StockChart() {
  const data: { date: string; price: number; volume: number }[] = [];

  for (let i = 1; i <= 200; i++) {
    data.push({
      date: `2025-01-${i.toString().padStart(2, "0")}`,
      price: 3200 + Math.floor(Math.random() * 500),
      volume: 1500000 + Math.floor(Math.random() * 2000000),
    });
  }

  const labels = data.map((d) => d.date);
  const prices = data.map((d) => d.price);
  const volume = data.map((d) => d.volume);

  const movingAverage = (
    arr: number[],
    n: number
  ): (number | null)[] =>
    arr.map((_, i) =>
      i < n
        ? null
        : Number(
            (
              arr.slice(i - n, i).reduce((a, b) => a + b, 0) / n
            ).toFixed(2)
          )
    );

  const dma50 = movingAverage(prices, 50);
  const dma200 = movingAverage(prices, 200);

  const chartData = {
    labels,
    datasets: [
      {
        type: "line" as const,
        label: "Price on NSE",
        data: prices,
        borderColor: "#3b82f6",
        borderWidth: 2,
        yAxisID: "y1",
      },
      {
        type: "line" as const,
        label: "50 DMA",
        data: dma50,
        borderColor: "#10b981",
        borderWidth: 1.5,
        borderDash: [5, 5],
        yAxisID: "y1",
      },
      {
        type: "line" as const,
        label: "200 DMA",
        data: dma200,
        borderColor: "#f59e0b",
        borderWidth: 1.5,
        borderDash: [8, 4],
        yAxisID: "y1",
      },
      {
        type: "bar" as const,
        label: "Volume",
        data: volume,
        backgroundColor: "rgba(59,130,246,0.3)",
        yAxisID: "y2",
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    stacked: false,
    plugins: {
      legend: { display: true, position: "bottom" as const },
    },
    scales: {
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: { display: true, text: "Price on NSE" },
      },
      y2: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: { display: true, text: "Volume" },
        grid: { drawOnChartArea: false },
      },
    },
  };

return (
  <div className="bg-white p-4 shadow rounded-lg">
    <h2 className="text-xl font-semibold mb-2">Stock Chart</h2>
    <div className="w-full h-[400px]">
      <Chart type="bar" data={chartData} options={options} />
    </div>
  </div>
);
}
