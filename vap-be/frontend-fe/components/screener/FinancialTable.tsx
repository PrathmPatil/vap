import { FinancialMetric } from "@/lib/financial";
import React from "react";

interface FinancialTableProps {
  title?: string;
  data: FinancialMetric[];
  className?: string;
}

const FinancialTable: React.FC<FinancialTableProps> = ({
  title="",
  data,
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }
  console.log("Rendering key:", title);
  console.log("With value:", data);

  // Get all year columns (exclude symbol and col_unknown)
  const yearColumns = Object.keys(data[0])
    .filter(
      (key) =>
        key !== "symbol" &&
        key !== "col_unknown" &&
        data[0][key] !== null &&
        key !== "id" &&
        data[0]["col_unknown"] !== "Raw PDF"
    )
    .sort()
    .reverse(); // Most recent first

  const formatValue = (value: string | number | null | undefined): string => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "null"
    ) {
      return "-";
    }

    // Convert number input to string
    let strValue = value.toString().trim();

    // Handle percentages
    if (strValue.endsWith("%")) {
      const numPercent = parseFloat(strValue.replace(",", "").replace("%", ""));
      if (!isNaN(numPercent)) {
        return `${numPercent.toFixed(2)}%`;
      }
      return strValue;
    }

    // Remove commas and parse number
    const numValue = parseFloat(strValue.replace(/,/g, ""));
    if (!isNaN(numValue)) {
      if (Math.abs(numValue) >= 1e7) {
        return `₹${(numValue / 1e7).toFixed(1)}Cr`;
      } else if (Math.abs(numValue) >= 1e5) {
        return `₹${(numValue / 1e5).toFixed(1)}L`;
      } else if (Math.abs(numValue) >= 1e3) {
        return `₹${(numValue / 1e3).toFixed(1)}K`;
      } else {
        return `₹${numValue.toFixed(2)}`;
      }
    }

    // Fallback for other strings
    return strValue;
  };

  const getValueColor = (value: string): string => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      if (numValue > 0) return "text-green-600";
      if (numValue < 0) return "text-red-600";
    }
    return "text-gray-900";
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Particulars
              </th>
              {yearColumns.map((year) => (
                <th
                  key={year}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32"
                >
                  {year.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                  {row.col_unknown || "-"}
                </td>
                {yearColumns.map((year) => (
                  <td
                    key={year}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getValueColor(
                      row[year]
                    )}`}
                  >
                    {formatValue(row[year])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialTable;
