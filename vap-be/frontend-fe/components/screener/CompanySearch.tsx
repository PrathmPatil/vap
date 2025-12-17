import React, { useState, useEffect } from "react";
import { Search, TrendingUp, Building } from "lucide-react";
import { Company } from "@/lib/financial";

interface CompanySearchProps {
  onCompanySelect: (company: Company) => void;
}

const CompanySearch: React.FC<CompanySearchProps> = ({ onCompanySelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);

  // Sample companies data - replace with your actual data
  useEffect(() => {
    const sampleCompanies: Company[] = [
      {
        symbol: "COASTCORP",
        name: "Coastal Corporation",
        sector: "Industrial",
        marketCap: 1500000000,
        currentPrice: 245.5,
      },
      {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd",
        sector: "Oil & Gas",
        marketCap: 1800000000000,
        currentPrice: 2456.75,
      },
      {
        symbol: "TCS",
        name: "Tata Consultancy Services",
        sector: "IT Services",
        marketCap: 1200000000000,
        currentPrice: 3245.2,
      },
      {
        symbol: "INFY",
        name: "Infosys Limited",
        sector: "IT Services",
        marketCap: 650000000000,
        currentPrice: 1567.85,
      },
      {
        symbol: "HDFC",
        name: "HDFC Bank Limited",
        sector: "Banking",
        marketCap: 900000000000,
        currentPrice: 1634.9,
      },
    ];
    setCompanies(sampleCompanies);
    setFilteredCompanies(sampleCompanies);
  }, []);

useEffect(() => {
  const query = searchQuery.toLowerCase();

  const filtered = companies.filter((company) => {
    const name = company.name ?? "";
    const symbol = company.symbol ?? "";

    return (
      name.toLowerCase().includes(query) ||
      symbol.toLowerCase().includes(query)
    );
  });

  setFilteredCompanies(filtered);
}, [searchQuery, companies]);


  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Stock Screener
          </h1>
          <p className="text-gray-600">
            Search and analyze financial data of listed companies
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search companies by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredCompanies.map((company) => (
            <div
              key={company.symbol}
              onClick={() => onCompanySelect(company)}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {company.name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-blue-600 font-medium">
                        {company.symbol}
                      </span>
                      <span className="text-gray-500 text-sm">•</span>
                      <span className="text-gray-600">{company.sector}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{company.currentPrice?.toFixed(2)}
                  </div>
                  {company.marketCap && (
                    <div className="text-sm text-gray-600">
                      Market Cap: {formatMarketCap(company.marketCap)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No companies found
            </h3>
            <p className="text-gray-600">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySearch;
