"use client";

import { useEffect, useState } from "react";
import { Search, Building2, Calendar, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import Link from "next/link";
import { getListedCompaniesData } from "@/utils";
import Pagination from "./ui/custom-pagination";

interface Company {
  id: number;
  symbol: string;
  name?: string;
  company_name?: string;
  series: string;
  date_of_listing: string;
  paid_up_value: number;
  market_lot: number;
  isin: string;
  face_value: number;
  created_at: string;
}

interface ListedCompaniesApiResponse {
  success: boolean;
  data: Company[];
  pages?: number;
  page?: number;
  total?: number;
  message?: string;
}

export function CompaniesTable() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);

  const formatSymbol = (symbol?: string) =>
    symbol?.replace(/\.NS$/i, "") || "-";

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);

      try {
        const response: ListedCompaniesApiResponse =
          await getListedCompaniesData(currentPage, limit, searchTerm);

        if (response.success) {
          setCompanies(response.data || []);

          const total = response.total || 0;
          const pages =
            response.pages || Math.ceil(total / limit) || 1;

          setTotalPages(pages);
          setTotalCompanies(total || response.data?.length || 0);
        } else {
          setCompanies([]);
          setTotalPages(1);
          setTotalCompanies(0);
          console.error(response.message || "Failed to fetch companies");
        }
      } catch (error) {
        console.error("Failed to fetch companies:", error);
        setCompanies([]);
        setTotalPages(1);
        setTotalCompanies(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [currentPage, searchTerm, limit]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section id="companies" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Listed Companies</span>
              </CardTitle>

              <CardDescription>
                Browse and search through {totalCompanies.toLocaleString()}{" "}
                listed companies
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchTerm(e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(limit)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-8 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Series</TableHead>
                      <TableHead>Listed Date</TableHead>
                      <TableHead>Face Value</TableHead>
                      <TableHead>Market Lot</TableHead>
                      <TableHead>ISIN</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-slate-500"
                        >
                          No companies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow
                          key={company?.id}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <TableCell className="font-semibold text-blue-600">
                            <Link
                              href={`/company/${formatSymbol(company?.symbol)}`}
                            >
                              {formatSymbol(company?.symbol)}
                            </Link>
                          </TableCell>

                          <TableCell className="max-w-xs truncate">
                            {company?.name || company?.company_name || "-"}
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary">
                              {company?.series || "-"}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>
                                {formatDate(company?.date_of_listing)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span>
                                ₹
                                {company?.face_value ??
                                  company?.paid_up_value ??
                                  "-"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            {company?.market_lot?.toLocaleString?.() ?? "-"}
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {company?.isin || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Total Records: {totalCompanies}</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={limit}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 25, 50, 100]}
                  className="mt-4"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}