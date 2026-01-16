'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Building2, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { getListedCompaniesData } from '@/utils';

interface Company {
  id: number;
  symbol: string;
  company_name: string;
  series: string;
  date_of_listing: string;
  paid_up_value: number;
  market_lot: number;
  isin: string;
  face_value: number;
  created_at: string;
}

interface CompaniesResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: Company[];
}

// Add this type to match what getListedCompaniesData actually returns
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10); // ✅ dynamic records per page
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        // Call the API function
        const response = await getListedCompaniesData(currentPage, limit, searchTerm);
        
        // Cast the response to the correct type
        const data = response as ListedCompaniesApiResponse;
        
        if (data.success) {
          setCompanies(data.data || []);
          
          // Handle pagination properties with fallbacks
          if (data.pages !== undefined) {
            setTotalPages(data.pages);
          } else if (data.total !== undefined) {
            // Calculate pages from total and limit if pages is not provided
            setTotalPages(Math.ceil(data.total / limit));
          } else {
            setTotalPages(1);
          }
          
          if (data.total !== undefined) {
            setTotalCompanies(data.total);
          } else {
            setTotalCompanies(data.data?.length || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [currentPage, searchTerm, limit]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <section id="companies" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Listed Companies</span>
              </CardTitle>
              <CardDescription>
                Browse and search through {totalCompanies.toLocaleString()} listed companies
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => {
                    setCurrentPage(1); // ✅ reset to first page on search
                    setSearchTerm(e.target.value);
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1); // ✅ reset page when changing limit
                }}
                className="border rounded p-1"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(limit)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
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
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No companies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-semibold text-blue-600">
                            <Link href={`/company/${company.symbol}`}>
                              {company.symbol}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{company.company_name}</TableCell>
                          <TableCell><Badge variant="secondary">{company.series}</Badge></TableCell>
                          <TableCell className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{formatDate(company.date_of_listing)}</span>
                          </TableCell>
                          <TableCell className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span>₹{company.face_value}</span>
                          </TableCell>
                          <TableCell>{company.market_lot.toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs">{company.isin}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-600">
                  Showing page {currentPage} of {totalPages} ({totalCompanies.toLocaleString()} total)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}