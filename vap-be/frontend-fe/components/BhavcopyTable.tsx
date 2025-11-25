'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { formatCellValue } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface ApiResponse<T> {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: T[];
}

interface DynamicTableProps {
  dynamicURL: string; // e.g. "listed-companies", "bh", "mcap"
  title?: string;
  description?: string;
  columns: { key: string; label: string }[];
}

export function BhavcopyTable({
  dynamicURL,
  title = 'Data Table',
  description = 'Browse and search through data',
  columns
}: DynamicTableProps) {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/vap';
  
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `${baseURL}/${dynamicURL}?page=${currentPage}&limit=${limit}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
        const response = await fetch(url);

        if (response.ok) {
          const data: ApiResponse<Record<string, any>> = await response.json();
          setRows(data.data || []);
          setTotalPages(data.pages || 1);
          setTotalItems(data.total || 0);
        }
      } catch (error) {
        console.error(`Failed to fetch ${dynamicURL}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dynamicURL, currentPage, searchTerm, limit, baseURL]);

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description} ({totalItems.toLocaleString()} total)</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearchTerm(e.target.value);
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
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
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data found</div>
          ) : (
            <>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map((col) => (
                          <TableCell key={col.key}>
                            {formatCellValue(row[col.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages} ({totalItems.toLocaleString()} total)
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
