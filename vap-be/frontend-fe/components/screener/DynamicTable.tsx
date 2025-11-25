import React from "react";

interface FinancialTableProps {
  title: string;
  data: any ;
  className?: string;
}

const DynamicTable: React.FC<FinancialTableProps> = ({
  title,
  data,
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className={`bg-white my-4 rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const allColumns = Array.from(
    new Set(
      data.flatMap((row : any) =>
        Object.keys(row).filter(
          (key) =>
            key !== "id" &&
            key !== "symbol" &&
            key !== "createdAt" &&
            key !== "updatedAt"
        )
      )
    )
  );

  const formatValue = (value: string | number | null | undefined): string => {
    if (!value || value === "" || value === "null") return "-";

    let strValue = value.toString().trim();

    // Handle percentages
    if (strValue.endsWith("%")) {
      const numPercent = parseFloat(strValue.replace(/,/g, "").replace("%", ""));
      if (!isNaN(numPercent)) return `${numPercent.toFixed(2)}%`;
      return strValue;
    }

    // Remove commas and parse number
    const numValue = parseFloat(strValue.replace(/,/g, ""));
    if (!isNaN(numValue)) {
      if (Math.abs(numValue) >= 1e7) return `₹${(numValue / 1e7).toFixed(1)}Cr`;
      if (Math.abs(numValue) >= 1e5) return `₹${(numValue / 1e5).toFixed(1)}L`;
      if (Math.abs(numValue) >= 1e3) return `₹${(numValue / 1e3).toFixed(1)}K`;
      return `₹${numValue.toFixed(2)}`;
    }

    return strValue;
  };

  const getValueColor = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "text-gray-900";
    const numValue = parseFloat(value.toString().replace(/,/g, ""));
    if (!isNaN(numValue)) {
      if (numValue > 0) return "text-green-600";
      if (numValue < 0) return "text-red-600";
    }
    return "text-gray-900";
  };

  return (
    <div
      className={`bg-white my-4 rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {allColumns.map((col: any, index:number) => (
                <th
                  key={index}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32"
                >
                  {col.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row:any, index:number) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {allColumns.map((col:any, index1:number) => (
                  <td
                    key={index1}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-center ${getValueColor(
                      row[col]
                    )}`}
                  >
                    {formatValue(row[col])}
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

export default DynamicTable;
