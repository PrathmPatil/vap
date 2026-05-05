"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { getFailedSymbolsList } from "@/utils";
import Pagination from "@/components/ui/custom-pagination";

interface FailedSymbol {
  id: number;
  symbol: string;
  reason: string;
  created_at: string;
}

interface FailedSymbolsResponse {
  success: boolean;
  data: FailedSymbol[];
  total?: number;
  message?: string;
}

export function FailedSymbols() {
  const [failedSymbols, setFailedSymbols] = useState<FailedSymbol[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchFailedSymbols = async () => {
      try {
        const response =
          (await getFailedSymbolsList()) as FailedSymbolsResponse;

        if (response.success && response.data) {
          setFailedSymbols(response.data);
        } else {
          console.error("Failed to fetch symbols:", response.message);
        }
      } catch (error) {
        console.error("Failed to fetch failed symbols:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFailedSymbols();
  }, []);

  // ✅ Pagination calculations
  const totalPages = Math.ceil(failedSymbols.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return failedSymbols.slice(startIndex, startIndex + itemsPerPage);
  }, [failedSymbols, currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReasonType = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes("not found") || lowerReason.includes("invalid")) {
      return { type: "error", icon: XCircle };
    }
    if (lowerReason.includes("timeout") || lowerReason.includes("connection")) {
      return { type: "warning", icon: Clock };
    }
    return { type: "default", icon: AlertTriangle };
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <section id="failed" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Failed Symbols</span>
          </CardTitle>
          <CardDescription>
            Symbols that encountered issues during data processing
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : failedSymbols.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                All Clear!
              </h3>
              <p className="text-slate-600">
                No failed symbols found. All systems running smoothly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, failedSymbols.length)}{" "}
                  of {failedSymbols.length}
                </div>
                <Badge variant="destructive">
                  {failedSymbols.length} Failed
                </Badge>
              </div>

              {/* Table */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((failed) => {
                      const reasonInfo = getReasonType(failed.reason);
                      const ReasonIcon = reasonInfo.icon;

                      return (
                        <TableRow key={failed.id}>
                          <TableCell className="font-mono font-semibold text-red-600">
                            {failed.symbol}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <ReasonIcon className="h-4 w-4 text-slate-400" />
                              <span className="max-w-md truncate">
                                {failed.reason}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">
                              {formatDate(failed.created_at)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                reasonInfo.type === "error"
                                  ? "destructive"
                                  : reasonInfo.type === "warning"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {reasonInfo.type === "error"
                                ? "Error"
                                : reasonInfo.type === "warning"
                                  ? "Warning"
                                  : "Issue"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSizeLabel={`${itemsPerPage} per page`}
                className="pt-4"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
