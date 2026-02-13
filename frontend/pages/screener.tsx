"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  RefreshCw,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { getAllYFinanceData, getUniqueSectors } from "@/utils";
import { defaultFilters, FilterCriteria, StockData } from "@/lib/screener";
import { CommonFilters } from "@/components/CommonFilters";
import { getFiltersConfig } from "@/lib/common";
import { getTableConfig } from "@/lib/tableConfig";
import { renderTable } from "@/components/RenderTable";
import DynamicSelect from "@/components/ui/dynamic-select";

// Define proper response type for paginated API
interface PaginatedYFinanceResponse {
  success: boolean;
  data: StockData[];
  pages?: number;
  page?: number;
  message?: string;
  total?: number;
  totalPages?: number;
}

// Complete filter criteria with all required properties
interface CompleteFilterCriteria {
  marketCapMin: number;
  marketCapMax: number;
  priceMin: number;
  priceMax: number;
  volumeMin: number;
  dividendYieldMin: number;
  dividendYieldMax: number;
  forwardPEMin: number;
  forwardPEMax: number;
  trailingPEMin: number;
  trailingPEMax: number;
  betaMin: number;
  betaMax: number;
  sector: string;
  onlyDividendPaying: boolean;
  onlyPositiveChange: boolean;
}

// Complete default filters with all properties
const completeDefaultFilters: CompleteFilterCriteria = {
  marketCapMin: 0,
  marketCapMax: 1000000000000,
  priceMin: 0,
  priceMax: 10000,
  volumeMin: 0,
  dividendYieldMin: 0,
  dividendYieldMax: 100,
  forwardPEMin: 0,
  forwardPEMax: 100,
  trailingPEMin: 0,
  trailingPEMax: 100,
  betaMin: 0,
  betaMax: 5,
  sector: "all",
  onlyDividendPaying: false,
  onlyPositiveChange: false,
};

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<CompleteFilterCriteria>(
    completeDefaultFilters,
  );
  const [sortBy, setSortBy] = useState<keyof StockData>("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [uniqueSectors, setUniqueSectors] = useState<string[]>([]);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      // Convert sortOrder to uppercase for API call
      const apiSortOrder = sortOrder.toUpperCase() as "ASC" | "DESC";

      const response = await getAllYFinanceData(
        "",
        currentPage,
        itemsPerPage,
        sortBy,
        apiSortOrder,
      );
      console.log("API Response:", response);
      // Cast response to our paginated type
      const paginatedResponse = response as PaginatedYFinanceResponse;
      const {
        success,
        data,
        pages,
        page,
        message,
        totalPages: resTotalPages,
      } = paginatedResponse;

      if (success) {
        setStocks(data || []);

        // Check multiple possible pagination properties
        if (pages !== undefined) {
          setTotalPages(pages);
        } else if (resTotalPages !== undefined) {
          setTotalPages(resTotalPages);
        } else {
          setTotalPages(1);
        }

        if (page !== undefined) {
          setCurrentPage(page);
        }
      } else {
        console.error("Failed to fetch stocks:", message);
      }
    } catch (error) {
      console.error("Failed to fetch stock data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        const response = await getUniqueSectors();
        if (response.success) setUniqueSectors(response.data || []);
      } catch (error) {
        console.error("Failed to fetch sectors:", error);
      }
    };
    fetchSectors();
    fetchStocks();
  }, [fetchStocks]);

  console.log("Stocks after fetch:", stocks);
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      if (!stock) return false;

      // Search
      if (
        searchTerm &&
        !stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !stock.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Market Cap
      if (
        stock.marketCap &&
        (stock.marketCap < filters.marketCapMin ||
          stock.marketCap > filters.marketCapMax)
      ) {
        return false;
      }

      // Price
      if (
        stock.currentPrice &&
        (stock.currentPrice < filters.priceMin ||
          stock.currentPrice > filters.priceMax)
      ) {
        return false;
      }

      // Volume
      if (stock.volume && stock.volume < filters.volumeMin) {
        return false;
      }

      // Sector
      if (filters.sector !== "all" && stock.sector !== filters.sector) {
        return false;
      }

      // Dividend Toggle
      if (filters.onlyDividendPaying && !stock.dividendYield) {
        return false;
      }

      // Positive Change Toggle
      if (filters.onlyPositiveChange && (stock.changePercent ?? 0) <= 0) {
        return false;
      }

      return true;
    });
  }, [stocks, searchTerm, filters]);

  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // Handle null/undefined values in sort
      if (aValue === null || aValue === undefined)
        return sortOrder === "asc" ? -1 : 1;
      if (bValue === null || bValue === undefined)
        return sortOrder === "asc" ? 1 : -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Convert to numbers for numeric comparison
      const numA = Number(aValue);
      const numB = Number(bValue);

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

  const resetFilters = () => {
    setFilters(completeDefaultFilters);
    setCurrentPage(1);
    setSearchTerm("");
  };
  console.log(filteredStocks);
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
      </div>
    </TableHead>
  );

  const exportToExcel = () => {
    const headers = getTableConfig()
      .map((col: any) => col.label)
      .join(",");
    const csv = stocks
      .map((stock) => {
        // Handle null values in export
        return Object.values(stock)
          .map((value) =>
            value === null || value === undefined ? "" : String(value),
          )
          .join(",");
      })
      .join("\n");
    const blob = new Blob([headers + "\n" + csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "screener_results.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Stock Screener
          </h1>
          <p className="text-slate-600 text-lg">
            Advanced stock filtering and fundamental analysis
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stocks.length}</div>
                <div className="text-sm text-slate-500">Filtered Results</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stocks.length}</div>
                <div className="text-sm text-slate-500">Total Stocks</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {
                    stocks.filter((s) => (s.changePercent ?? 0) > 0)
                      .length
                  }
                </div>
                <div className="text-sm text-slate-500">Gainers</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center space-x-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold">
                  {
                    stocks.filter((s) => (s.changePercent ?? 0) < 0)
                      .length
                  }
                </div>
                <div className="text-sm text-slate-500">Losers</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Filters Sidebar */}
          <div className="xl:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommonFilters
                  filtersConfig={getFiltersConfig(
                    filters,
                    setFilters,
                    uniqueSectors,
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
                      {stocks.length} stocks match your criteria
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
                    <Button variant="outline" size="sm" onClick={exportToExcel}>
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

                {/* Search Bar */}
                <div className="flex items-center space-x-4 mt-4">
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
                                <TableHead key={col.key}>{col.label}</TableHead>
                              ),
                            )}
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {renderTable(
                            stocks,
                            getTableConfig(),
                            resetFilters,
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
                        <div className="text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = Math.max(1, currentPage - 1);
                              setCurrentPage(newPage);
                              fetchStocks();
                            }}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
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
                              },
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPage = Math.min(
                                totalPages,
                                currentPage + 1,
                              );
                              setCurrentPage(newPage);
                              fetchStocks();
                            }}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
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
      </main>
    </div>
  );
}
