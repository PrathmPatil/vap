import { exportRowsToCsv } from "@/lib/exportData";

interface CompanyHeaderProps {
  name: string;
  price: string;
  change: string;
  date: string;
  exportRows?: Record<string, unknown>[];
  exportFilename?: string;
}

export default function CompanyHeader({
  name,
  price,
  change,
  date,
  exportRows,
  exportFilename = "company-export.csv",
}: CompanyHeaderProps) {
  const isNegative = change.startsWith("-");

  const handleExport = () => {
    if (!exportRows?.length) {
      exportRowsToCsv(
        [
          {
            name,
            price,
            change,
            date,
          },
        ],
        { filename: exportFilename }
      );
      return;
    }
    exportRowsToCsv(exportRows, { filename: exportFilename });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>

          <div className="text-xl text-gray-700">
            {price}{" "}
            <span className={isNegative ? "text-red-500" : "text-green-500"}>
              {change}
            </span>
          </div>

          <div className="text-sm text-gray-500">{date} – close price</div>
        </div>

        <div className="flex space-x-2 md:space-x-4">
          <button type="button" className="btn btn-primary">
            Follow
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExport}
          >
            Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
