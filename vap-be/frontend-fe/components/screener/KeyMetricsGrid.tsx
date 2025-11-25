// components/KeyMetricsGrid.jsx
export default function KeyMetricsGrid({ metrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
      {metrics.map(({ label, value }) => (
        <div key={label} className="bg-white shadow p-4 rounded">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      ))}
    </div>
  );
}
