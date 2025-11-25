'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  labels: string[];
  dataPoints: number[];
  label:string;
  optionsTitle:string
}

export default function BarChartComponent({ labels, dataPoints, label, optionsTitle }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: label,
        data: dataPoints,
        backgroundColor: "rgba(54, 162, 235, 0.6)"
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: optionsTitle }
    }
  };

  return <Bar data={data} options={options} />;
}
