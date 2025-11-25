"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Star,
  Eye,
  Download,
  RefreshCw,
  Settings,
} from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { getAllYFinanceData, getUniqueSectors } from "@/utils";
import { defaultFilters, FilterCriteria, StockData } from "@/lib/screener";
import renderFilter from "@/components/RenderFilter";
import { CommonFilters } from "@/components/CommonFilters";
import { getFiltersConfig } from "@/lib/common";
import { getTableConfig } from "@/lib/tableConfig";
import { renderTable } from "@/components/RenderTable";
import DynamicSelect from "@/components/ui/dynamic-select";

const presetScreens = [
  {
    name: "Large Cap Growth",
    description: "Large cap stocks with strong growth",
    filters: {
      marketCapMin: 50000,
      roeMin: 15,
      salesGrowthMin: 10,
      profitGrowthMin: 10,
      onlyProfitable: true,
    },
  },
  {
    name: "Value Stocks",
    description: "Undervalued stocks with low P/E",
    filters: { peMax: 15, pbMax: 2, dividendYieldMin: 2, currentRatioMin: 1.5 },
  },
  {
    name: "Dividend Aristocrats",
    description: "High dividend yielding stocks",
    filters: {
      dividendYieldMin: 3,
      onlyDividendPaying: true,
      roeMin: 12,
      debtToEquityMax: 1,
    },
  },
  {
    name: "Small Cap Gems",
    description: "Small cap stocks with potential",
    filters: {
      marketCapMax: 5000,
      roeMin: 20,
      debtMax: 30,
      salesGrowthMin: 15,
    },
  },
  {
    name: "Quality Stocks",
    description: "High quality fundamentally strong stocks",
    filters: {
      roeMin: 18,
      debtMax: 25,
      peMax: 25,
      onlyProfitable: true,
      currentRatioMin: 1.2,
    },
  },
  {
    name: "High Growth",
    description: "Companies with exceptional growth",
    filters: {
      salesGrowthMin: 20,
      profitGrowthMin: 25,
      roeMin: 20,
      onlyPositiveGrowth: true,
    },
  },
  {
    name: "Low Debt",
    description: "Companies with minimal debt",
    filters: {
      debtToEquityMax: 0.5,
      interestCoverageMin: 10,
      currentRatioMin: 2,
    },
  },
  {
    name: "Profitable & Efficient",
    description: "Profitable companies with good margins",
    filters: {
      operatingMarginMin: 15,
      netMarginMin: 10,
      roeMin: 15,
      onlyProfitable: true,
    },
  },
];

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterCriteria>(defaultFilters);
  const [sortBy, setSortBy] = useState<keyof StockData>("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleBackToSearch = () => {
    setSelectedCompany(null);
  };

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllYFinanceData(
        "",
        currentPage,
        itemsPerPage,
        sortBy,
        sortOrder
      );
      console.log(response);
      if (response && response.success) {
        setStocks(response.data || []);
        setTotalPages(response.pages || 1);
        setCurrentPage(response.page || 1);
      }
    } catch (error) {
      console.error("Failed to fetch stock data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    // Fetch unique sectors
    const fetchUniqueSectors = async () => {
      try {
        const response = await getUniqueSectors();
        console.log(response);
        if (response && response.success) {
          setUniqueSectors(response.sectors.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch sectors:", error);
      }
    };

    fetchUniqueSectors();
    fetchStocks(); // call the async function
  }, [fetchStocks]);

  console.log(uniqueSectors);
  console.log("All Stocks:", stocks);
  // Apply filters and search
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      // 🔍 Search filter
      if (
        searchTerm &&
        !stock.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // 📊 Range filters
      if (
        stock.marketCap < filters.marketCapMin ||
        stock.marketCap > filters.marketCapMax
      )
        return false;
      if (
        stock.currentPrice < filters.priceMin ||
        stock.currentPrice > filters.priceMax
      )
        return false;
      if (stock.volume < filters.volumeMin) return false;
      if (
        stock.dividendYield < filters.dividendYieldMin ||
        stock.dividendYield > filters.dividendYieldMax
      )
        return false;
      if (
        stock.forwardPE < filters.forwardPEMin ||
        stock.forwardPE > filters.forwardPEMax
      )
        return false;
      if (
        stock.trailingPE < filters.trailingPEMin ||
        stock.trailingPE > filters.trailingPEMax
      )
        return false;
      if (stock.beta < filters.betaMin || stock.beta > filters.betaMax)
        return false;

      // 📌 Sector filter
      if (filters.sector !== "all" && stock.sector !== filters.sector)
        return false;

      // ✅ Boolean filters
      if (filters.onlyDividendPaying && stock.dividendYield <= 0) return false;
      if (filters.onlyPositiveChange && stock.changePercent <= 0) return false;

      return true;
    });
  }, [stocks, searchTerm, filters]);

  // Sort stocks
  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;

      return sortOrder === "asc" ? numA - numB : numB - numA;
    });
  }, [filteredStocks, sortBy, sortOrder]);

  const handleSort = (column: keyof StockData) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const applyPreset = (preset: (typeof presetScreens)[0]) => {
    setFilters({ ...defaultFilters, ...preset.filters });
    setActivePreset(preset.name);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActivePreset(null);
    setCurrentPage(1);
    setSearchTerm("");
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `₹${(value / 1000).toFixed(0)}K Cr`;
    }
    return `₹${value.toFixed(0)} Cr`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: keyof StockData;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-slate-50 transition-colors select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3 text-slate-400" />
        {sortBy === column && (
          <div
            className={`text-blue-600 ${
              sortOrder === "asc" ? "rotate-180" : ""
            }`}
          >
            <TrendingUp className="h-3 w-3" />
          </div>
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Stock Screener
            </h1>
            <p className="text-slate-600 text-lg">
              Advanced stock filtering and fundamental analysis
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {sortedStocks.length}
                    </div>
                    <div className="text-sm text-slate-500">
                      Filtered Results
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {stocks.length}
                    </div>
                    <div className="text-sm text-slate-500">Total Stocks</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {sortedStocks.filter((s) => s.changePercent > 0).length}
                    </div>
                    <div className="text-sm text-slate-500">Gainers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {sortedStocks.filter((s) => s.changePercent < 0).length}
                    </div>
                    <div className="text-sm text-slate-500">Losers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preset Screens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <span>Preset Screens</span>
              </CardTitle>
              <CardDescription>
                Quick access to popular screening strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presetScreens.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={
                      activePreset === preset.name ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="flex-shrink-0"
                  >
                    {preset.name}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Filters Sidebar */}
            <div className="xl:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>Filters</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CommonFilters
                    filtersConfig={getFiltersConfig(
                      filters,
                      setFilters,
                      uniqueSectors
                    )}
                    resetFilters={resetFilters}
                    showFilters={showFilters}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <div className="xl:col-span-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <span>Screening Results</span>
                      </CardTitle>
                      <CardDescription>
                        {sortedStocks.length} stocks match your criteria
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DynamicSelect
                        options={[
                          { value: 10, label: "10 per page" },
                          { value: 25, label: "25 per page" },
                          { value: 50, label: "50 per page" },
                          { value: 100, label: "100 per page" },
                        ]}
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                      />
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Individual Search Bar */}
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search by company name or symbol..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm("")}
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          {[...Array(12)].map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {getTableConfig().map((col: any, index: number) =>
                                col.sortable ? (
                                  <SortableHeader
                                    key={col.key + index}
                                    column={col.key}
                                  >
                                    {col.label}
                                  </SortableHeader>
                                ) : (
                                  <TableHead key={col.key}>
                                    {col.label}
                                  </TableHead>
                                )
                              )}
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {loading
                              ? [...Array(10)].map((_, i) => (
                                  <TableRow key={i}>
                                    {[
                                      ...Array(getTableConfig().length + 1),
                                    ].map((_, j) => (
                                      <TableCell key={j}>
                                        <Skeleton className="h-4 w-full" />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              : renderTable(
                                  sortedStocks,
                                  getTableConfig(),
                                  resetFilters
                                )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mt-6">
                          <div className="text-sm text-slate-600">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage, totalPages)} of {totalPages}{" "}
                            results
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentPage(Math.max(1, currentPage - 1));
                                fetchStocks();
                              }}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>

                            <div className="flex items-center space-x-1">
                              {Array.from(
                                { length: Math.min(5, totalPages) },
                                (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }

                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={
                                        currentPage === pageNum
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() => {
                                        setCurrentPage(pageNum);
                                        fetchStocks();
                                      }}
                                      disabled={currentPage === pageNum}
                                      className="w-8 h-8 p-0"
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                }
                              )}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage(
                                  Math.min(totalPages, currentPage + 1)
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
