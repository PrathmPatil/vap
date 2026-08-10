'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DatePicker } from './ui/date-picker';
import { formatCellValue } from '@/lib/utils';
import { PageLoader } from './ui/PageLoader';
import { getDynamicData } from '@/utils';
import Pagination from './ui/custom-pagination';

interface ApiResponse<T> {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: T[];
}

interface DynamicTableProps {
  dynamicURL: string; // e.g. "bhavcopy/pr", "bhavcopy/mcap"
  title?: string;
  description?: string;
  columns: { key: string; label: string }[];
  /** Show date-wise filter (source_date). Default true for bhavcopy tables. */
  enableDateFilter?: boolean;
}

export function BhavcopyTable({
  dynamicURL,
  title = 'Data Table',
  description = 'Browse and search through data',
  columns,
  enableDateFilter = true,
}: DynamicTableProps) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL;

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getDynamicData(
          dynamicURL,
          currentPage,
          limit,
          searchTerm,
          dateFilter ? { date: dateFilter } : {},
        );
        const { data, pages, success, total } = response as ApiResponse<
          Record<string, any>
        >;
        if (success) {
          setRows(data || []);
          setTotalPages(pages || 1);
          setTotalItems(total || 0);
        }
      } catch (error) {
        console.error(`Failed to fetch ${dynamicURL}:`, error);
        setRows([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dynamicURL, currentPage, searchTerm, limit, dateFilter, baseURL]);

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {description} ({totalItems.toLocaleString()} total
                {dateFilter ? ` for ${dateFilter}` : ''})
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {enableDateFilter && (
                <DatePicker
                  value={dateFilter}
                  onChange={(next) => {
                    setCurrentPage(1);
                    setDateFilter(next);
                  }}
                  placeholder="Filter by date"
                  clearable
                  className="w-52 min-w-0"
                  aria-label="Filter by date"
                />
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search symbol, security..."
                  value={searchTerm}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearchTerm(e.target.value);
                  }}
                  className="w-64 pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <PageLoader inline message="Loading market data…" />
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No data found
              {dateFilter ? ` for ${dateFilter}` : ''}
              {searchTerm ? ` matching "${searchTerm}"` : ''}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
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

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalItems}
                onPageChange={setCurrentPage}
                pageSize={limit}
                onPageSizeChange={setLimit}
                pageSizeOptions={[10, 25, 50, 100]}
                className="mt-3"
              />
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
