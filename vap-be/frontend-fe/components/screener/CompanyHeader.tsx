interface CompanyHeaderProps {
  name: string;
  price: string;
  change: string;
  date: string;
}

export default function CompanyHeader({
  name,
  price,
  change,
  date,
}: CompanyHeaderProps) {
  const isNegative = change.startsWith("-");

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>

          <div className="text-xl text-gray-700">
            {price}{" "}
            <span
              className={isNegative ? "text-red-500" : "text-green-500"}
            >
              {change}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            {date} – close price
          </div>
        </div>

        <div className="flex space-x-2 md:space-x-4">
          <button className="btn btn-primary">Follow</button>
          <button className="btn btn-outline">Export to Excel</button>
        </div>
      </div>
    </div>
  );
}
