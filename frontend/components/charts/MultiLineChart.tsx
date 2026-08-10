'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export type ChartDataset = {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor?: string;
  borderDash?: number[];
  fill?: boolean;
  yAxisID?: string;
};

interface Props {
  labels: string[];
  datasets: ChartDataset[];
  optionsTitle?: string;
  heightClassName?: string;
}

export default function MultiLineChart({
  labels,
  datasets,
  optionsTitle,
  heightClassName = "h-80",
}: Props) {
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      ...ds,
      tension: 0.25,
      pointRadius: 0,
      borderWidth: 1.5,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: Boolean(optionsTitle),
        text: optionsTitle || "",
      },
    },
    scales: {
      y: { position: "left" as const },
      y1: {
        position: "right" as const,
        grid: { drawOnChartArea: false },
        display: datasets.some((d) => d.yAxisID === "y1"),
      },
    },
  };

  return (
    <div className={heightClassName}>
      <Line data={data} options={options} />
    </div>
  );
}
