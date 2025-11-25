'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  labels: string[];
  dataPoints: number[];
  label: string;
  optionsTitle: string;
}

export default function PieChartComponent({ labels, dataPoints, label, optionsTitle }: Props) {
  // Function to generate random colors
  const generateColors = (count: number, alpha: number) => {
    return Array.from({ length: count }, () => {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  };

  const backgroundColors = generateColors(labels.length, 0.6);
  const borderColors = backgroundColors.map(color => color.replace(/0\.6\)$/, "1)"));

  const data = {
    labels,
    datasets: [
      {
        label,
        data: dataPoints,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
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

  return <Pie data={data} options={options} />;
}
