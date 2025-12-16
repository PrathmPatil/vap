import React, { useState, useEffect } from "react";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Search,
  Eye,
} from "lucide-react";
import { Company } from "@/lib/financial";

interface WatchlistItem extends Company {
  id: string;
  addedAt: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
}

interface WatchlistPageProps {
  onCompanySelect?: (company: Company) => void;
}

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredWatchlist, setFilteredWatchlist] = useState<WatchlistItem[]>(
    []
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCompanies] = useState<Company[]>([
    {
      symbol: "RELIANCE",
      name: "Reliance Industries Ltd",
      sector: "Oil & Gas",
    },
    { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT Services" },
    { symbol: "INFY", name: "Infosys Limited", sector: "IT Services" },
    { symbol: "HDFC", name: "HDFC Bank Limited", sector: "Banking" },
    { symbol: "ICICIBANK", name: "ICICI Bank Limited", sector: "Banking" },
    { symbol: "WIPRO", name: "Wipro Limited", sector: "IT Services" },
    { symbol: "COASTCORP", name: "Coastal Corporation", sector: "Industrial" },
  ]);

  const onCompanySelect = (company: Company) => {
    console.log("Selected company from watchlist:", company);
  };

  useEffect(() => {
    // Load watchlist from localStorage or set sample data
    const savedWatchlist = localStorage.getItem("stockWatchlist");
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    } else {
      // Sample watchlist data
      const sampleWatchlist: WatchlistItem[] = [
        {
          id: "1",
          symbol: "RELIANCE",
          name: "Reliance Industries Ltd",
          sector: "Oil & Gas",
          addedAt: "2024-01-10T10:00:00Z",
          currentPrice: 2456.75,
          previousClose: 2445.2,
          change: 11.55,
          changePercent: 0.47,
          volume: 2850000,
          high52Week: 2968.0,
          low52Week: 2220.3,
          marketCap: 1800000000000,
        },
        {
          id: "2",
          symbol: "TCS",
          name: "Tata Consultancy Services",
          sector: "IT Services",
          addedAt: "2024-01-08T14:30:00Z",
          currentPrice: 3245.2,
          previousClose: 3267.85,
          change: -22.65,
          changePercent: -0.69,
          volume: 1450000,
          high52Week: 4259.0,
          low52Week: 3056.65,
          marketCap: 1200000000000,
        },
        {
          id: "3",
          symbol: "HDFC",
          name: "HDFC Bank Limited",
          sector: "Banking",
          addedAt: "2024-01-05T09:15:00Z",
          currentPrice: 1634.9,
          previousClose: 1628.45,
          change: 6.45,
          changePercent: 0.4,
          volume: 3200000,
          high52Week: 1794.0,
          low52Week: 1363.55,
          marketCap: 900000000000,
        },
      ];
      setWatchlist(sampleWatchlist);
      localStorage.setItem("stockWatchlist", JSON.stringify(sampleWatchlist));
    }
  }, []);

  useEffect(() => {
    const filtered = watchlist.filter(
      (item) =>
        (item.name?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()) ||
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredWatchlist(filtered);
  }, [watchlist, searchQuery]);

  const addToWatchlist = (company: Company) => {
    const newItem: WatchlistItem = {
      ...company,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
      currentPrice: Math.random() * 3000 + 500, // Random price for demo
      previousClose: Math.random() * 3000 + 500,
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 5000000) + 100000,
      high52Week: Math.random() * 4000 + 1000,
      low52Week: Math.random() * 2000 + 500,
      marketCap: Math.random() * 2000000000000 + 100000000000,
    };

    const updatedWatchlist = [...watchlist, newItem];
    setWatchlist(updatedWatchlist);
    localStorage.setItem("stockWatchlist", JSON.stringify(updatedWatchlist));
    setShowAddModal(false);
  };

  const removeFromWatchlist = (id: string) => {
    const updatedWatchlist = watchlist.filter((item) => item.id !== id);
    setWatchlist(updatedWatchlist);
    localStorage.setItem("stockWatchlist", JSON.stringify(updatedWatchlist));
  };

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
    return `₹${value.toLocaleString()}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e7) return `${(volume / 1e7).toFixed(1)}Cr`;
    if (volume >= 1e5) return `${(volume / 1e5).toFixed(1)}L`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className="min-h-screen">
      <div className="rounded-lg p-6 border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Stock
          </button>
          <div className="">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search watchlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Search */}

        {/* Watchlist Table */}
        {filteredWatchlist.length > 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      52W Range
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWatchlist.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-3 fill-current" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.symbol} • {item.sector}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{item.currentPrice.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className={`flex items-center justify-end ${
                            item.change >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {item.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          <div className="text-sm font-medium">
                            {item.change >= 0 ? "+" : ""}₹
                            {item.change.toFixed(2)}
                            <div className="text-xs">
                              ({item.changePercent >= 0 ? "+" : ""}
                              {item.changePercent.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatVolume(item.volume)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {item.marketCap ? formatMarketCap(item.marketCap) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        <div>
                          ₹{item.low52Week.toFixed(0)} - ₹
                          {item.high52Week.toFixed(0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => onCompanySelect?.(item)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "No stocks found" : "Your watchlist is empty"}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Add stocks to track their performance"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Stock
              </button>
            )}
          </div>
        )}

        {/* Add Stock Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Stock to Watchlist
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableCompanies
                  .filter(
                    (company) =>
                      !watchlist.some((item) => item.symbol === company.symbol)
                  )
                  .map((company) => (
                    <div
                      key={company.symbol}
                      onClick={() => addToWatchlist(company)}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {company.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {company.symbol} • {company.sector}
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchlistPage;
