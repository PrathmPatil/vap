"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Activity,
  BarChart3,
  Eye,
} from "lucide-react";
import Link from "next/link";
import Navigation from "./Navigation";
import CalendarPicker from "./CalendarPicker";
import { getAnalyzeCompaniesData } from "@/utils";

export interface MarketSignal {
  symbol: string;
  date: string;
}

export interface MarketSignalsData {
  RallyAttemptDay: MarketSignal[];
  FollowThroughDay: MarketSignal[];
  BuyDay: MarketSignal[];
}

export default function MarketSignalsPage() {
  const [data, setData] = useState<MarketSignalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rally" | "followthrough" | "buy">(
    "rally",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);
  const fetchData = async (date: string) => {
    setLoading(true);
    try {
      const response = await getAnalyzeCompaniesData(date);
      console.log("Response from analyze companies API:", response);
      setData(response);
    } catch (error) {
      console.error("Error fetching company data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const getCurrentData = () => {
    if (!data) return [];
    switch (activeTab) {
      case "rally":
        return data.RallyAttemptDay;
      case "followthrough":
        return data.FollowThroughDay;
      case "buy":
        return data.BuyDay;
      default:
        return [];
    }
  };

  const filteredData = useMemo(() => {
    const currentData = getCurrentData();
    if (!searchTerm) return currentData;

    return currentData.filter(
      (item) =>
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.includes(searchTerm),
    );
  }, [data, activeTab, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTabConfig = (tab: string) => {
    switch (tab) {
      case "rally":
        return {
          title: "Rally Attempt Day",
          description: "Stocks showing initial rally attempts",
          icon: TrendingUp,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          count: data?.RallyAttemptDay.length || 0,
        };
      case "followthrough":
        return {
          title: "Follow Through Day",
          description: "Stocks confirming upward momentum",
          icon: BarChart3,
          color: "text-green-600",
          bgColor: "bg-green-50",
          count: data?.FollowThroughDay.length || 0,
        };
      case "buy":
        return {
          title: "Buy Day",
          description: "Stocks with strong buy signals",
          icon: Target,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          count: data?.BuyDay.length || 0,
        };
      default:
        return {
          title: "",
          description: "",
          icon: Activity,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          count: 0,
        };
    }
  };

  return (
    <div className="">
      {/* Main Content */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Signal Date</TableHead>
              <TableHead>Days Ago</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((signal, index) => {
                const daysAgo = getDaysAgo(signal.date);

                return (
                  <TableRow
                    key={`${signal.symbol}-${signal.date}-${index}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="font-semibold text-blue-600">
                      <Link
                        href={`/company/${signal.symbol}`}
                        className="hover:underline"
                      >
                        {signal.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{formatDate(signal.date)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          daysAgo <= 1
                            ? "default"
                            : daysAgo <= 3
                              ? "secondary"
                              : "outline"
                        }
                        className={daysAgo <= 1 ? config.color : ""}
                      >
                        {daysAgo === 0
                          ? "Today"
                          : daysAgo === 1
                            ? "1 day ago"
                            : `${daysAgo} days ago`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/company/${signal.symbol}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-3 w-3" />
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-slate-500"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Market Signals</span>
                  </CardTitle>
                  <CardDescription>
                    Analyze market signals across different categories
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search symbols or dates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as any)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  {(["rally", "followthrough", "buy"] as const).map((tab) => {
                    const config = getTabConfig(tab);
                    const IconComponent = config.icon;

                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="flex items-center space-x-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="hidden sm:inline">{config.title}</span>
                        <span className="sm:hidden">
                          {tab === "followthrough" ? "FTD" : tab.toUpperCase()}
                        </span>
                        <Badge variant="secondary" className="ml-1">
                          {config.count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {(["rally", "followthrough", "buy"] as const).map((tab) => {
                  const config = getTabConfig(tab);

                  return (
                    <TabsContent key={tab} value={tab} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">
                            {config.title}
                          </h3>
                          <Badge variant="outline">
                            {filteredData.length} of {config.count} signals
                          </Badge>
                        </div>
                      </div>

                      {filteredData.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="mb-4">
                            <div
                              className={`mx-auto w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}
                            >
                              <config.icon
                                className={`h-8 w-8 ${config.color}`}
                              />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {searchTerm
                              ? "No matching signals found"
                              : "No signals available"}
                          </h3>
                          <p className="text-slate-600">
                            {searchTerm
                              ? "Try adjusting your search terms or check other signal types."
                              : `No ${config.title.toLowerCase()} signals detected at this time.`}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Symbol</TableHead>
                                  <TableHead>Signal Date</TableHead>
                                  <TableHead>Days Ago</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedData.length > 0 ? (
                                  paginatedData.map((signal, index) => {
                                    const daysAgo = getDaysAgo(signal.date);

                                    return (
                                      <TableRow
                                        key={`${signal.symbol}-${signal.date}-${index}`}
                                        className="hover:bg-slate-50 transition-colors"
                                      >
                                        <TableCell className="font-semibold text-blue-600">
                                          <Link
                                            href={`/company/${signal.symbol}`}
                                            className="hover:underline"
                                          >
                                            {signal.symbol}
                                          </Link>
                                        </TableCell>
                                        <TableCell className="flex items-center space-x-1">
                                          <Calendar className="h-3 w-3 text-slate-400" />
                                          <span>{formatDate(signal.date)}</span>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={
                                              daysAgo <= 1
                                                ? "default"
                                                : daysAgo <= 3
                                                ? "secondary"
                                                : "outline"
                                            }
                                            className={
                                              daysAgo <= 1 ? config.color : ""
                                            }
                                          >
                                            {daysAgo === 0
                                              ? "Today"
                                              : daysAgo === 1
                                              ? "1 day ago"
                                              : `${daysAgo} days ago`}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Link
                                            href={`/company/${signal.symbol}`}
                                          >
                                            <Button variant="outline" size="sm">
                                              <Eye className="mr-2 h-3 w-3" />
                                              View Details
                                            </Button>
                                          </Link>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                ) : (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="text-center py-8 text-slate-500"
                                    >
                                      No results found
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-600">
                                Showing {(currentPage - 1) * itemsPerPage + 1}{" "}
                                to{" "}
                                {Math.min(
                                  currentPage * itemsPerPage,
                                  filteredData.length
                                )}{" "}
                                of {filteredData.length} results
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setCurrentPage(Math.max(1, currentPage - 1))
                                  }
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
                                      } else if (
                                        currentPage >=
                                        totalPages - 2
                                      ) {
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
                                          onClick={() =>
                                            setCurrentPage(pageNum)
                                          }
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
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card> */}
    </div>
  );
}
