'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";

// Register all possible Chart.js elements you might use
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = "line" | "bar" | "pie" | "doughnut";

interface MasterChartProps {
  type: ChartType; // type of chart
  data: any; // chart.js data object from parent
  options?: any; // chart.js options from parent
}

export default function MasterChart({ type, data, options }: MasterChartProps) {
  const ChartMap: Record<ChartType, React.ComponentType<any>> = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut
  };

  const ChartComponent = ChartMap[type];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ChartComponent data={data} options={options} />
    </div>
  );
}
