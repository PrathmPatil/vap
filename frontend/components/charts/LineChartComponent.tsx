'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  labels: string[];
  dataPoints: number[];
  label:string,
  optionsTitle:string
}

export default function LineChartComponent({label, labels, dataPoints, optionsTitle }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: label || "",
        data: dataPoints,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.3
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const
      },
      title: {
        display: true,
        text: optionsTitle || ""
      }
    }
  };

  return <Line data={data} options={options} style={{width:"50rem"}}  />;
}
