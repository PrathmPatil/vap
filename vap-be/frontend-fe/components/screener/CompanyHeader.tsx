// components/CompanyHeader.jsx
export default function CompanyHeader({ name, price, change, date }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>
          <div className="text-xl text-gray-700">{price} <span className={change[0] === '-' ? 'text-red-500' : 'text-green-500'}>{change}</span></div>
          <div className="text-sm text-gray-500">{date} – close price</div>
        </div>
        <div className="flex space-x-2 md:space-x-4">
          <button className="btn btn-primary">Follow</button>
          <button className="btn btn-outline">Export to Excel</button>
          {/* External links */}
        </div>
      </div>
    </div>
  );
}

