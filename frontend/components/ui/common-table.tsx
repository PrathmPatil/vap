'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
  import Pagination from '@/components/ui/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ColumnConfig {
  key: string;
  label?: string;
  sortable?: boolean;
  searchable?: boolean;
  format?: (value: any, row: any) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface CommonTableProps {
  data?: any[];
  columns?: ColumnConfig[];
  itemsPerPage?: number;
  setItemsPerPage?: (items: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalItems?: number;
  loading?: boolean;
  onRowClick?: (row: any) => void;
  onExport?: () => void;
  showExport?: boolean;
  exportLabel?: string;
  pageSizeMin?: number;
  pageSizeMax?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (searchTerm: string) => void;
  searchTerm?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  emptyStateMessage?: string;
  emptyStateIcon?: React.ReactNode;
  className?: string;
  totalPages: number;
}

export default function CommonTable({
  data = [],
  columns: customColumns,
  itemsPerPage = 10,
  setItemsPerPage,
  currentPage = 1,
  setCurrentPage,
  totalItems,
  loading = false,
  onRowClick,
  onExport,
  showExport = false,
  exportLabel = "Export",
  pageSizeMin,
  pageSizeMax,
  showSearch = false,
  searchPlaceholder = "Search...",
  onSearch,
  searchTerm = "",
  sortColumn,
  sortDirection = 'asc',
  onSort,
  emptyStateMessage = "No results found",
  emptyStateIcon,
  className = "",
  totalPages,
}: CommonTableProps) {
  
  const safeData = Array.isArray(data) ? data : [];
  const total = totalItems || safeData.length;

  // Generate columns from data if not provided (never show id / audit dates in UI)
  const columns = React.useMemo(() => {
    const hideKey = (key: string) => {
      const k = key.toLowerCase();
      return (
        k === "id" ||
        k === "trade_date" ||
        k === "tradedate" ||
        k === "created_at" ||
        k === "updated_at" ||
        k === "createdat" ||
        k === "updatedat"
      );
    };

    if (customColumns && customColumns.length > 0) {
      return customColumns.filter((col) => !hideKey(col.key));
    }
    
    if (!safeData.length) return [];
    
    return Object.keys(safeData[0])
      .filter((key) => !hideKey(key))
      .map(key => ({
        key,
        label: key.replace(/_/g, ' '),
        sortable: true,
        searchable: true,
        className: undefined,
        hideOnMobile: undefined,
      }));
  }, [customColumns, safeData]);

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const column = columns.find(col => col.key === columnKey);
    if (column?.sortable) {
      onSort(columnKey);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />;
  };

  const paginatedData = React.useMemo(() => {
    if (totalItems) return safeData;
    const start = (currentPage - 1) * itemsPerPage;
    return safeData.slice(start, start + itemsPerPage);
  }, [safeData, currentPage, itemsPerPage, totalItems]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const pageSizeOptions = React.useMemo(() => {
    const base = [5, 10, 20, 25, 50, 100];
    let options = base.filter(
      (size) =>
        (pageSizeMin == null || size >= pageSizeMin) &&
        (pageSizeMax == null || size <= pageSizeMax)
    );
    if (pageSizeMax != null && pageSizeMax <= 50 && !options.includes(pageSizeMax)) {
      options = [...options, pageSizeMax].sort((a, b) => a - b);
    }
    if (itemsPerPage && !options.includes(itemsPerPage)) {
      options = [...options, itemsPerPage].sort((a, b) => a - b);
    }
    return options.length ? options : [10, 25, 50];
  }, [pageSizeMin, pageSizeMax, itemsPerPage]);

  const renderCellContent = (row: any, column: ColumnConfig) => {
    const value = row[column.key];
    
    if (column.format) {
      return column.format(value, row);
    }
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="font-mono">{value.toLocaleString()}</span>;
    }
    
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      const date = new Date(value);
      return date.toLocaleDateString();
    }
    
    return value;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`rounded-lg border ${className}`}>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>

      {(showSearch || showExport) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {showSearch && onSearch && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            {showExport && onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                {exportLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 border-b">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`
                      ${column.sortable ? 'cursor-pointer select-none' : ''}
                      ${column.className || ''}
                      ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                    `}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.label || column.key.replace(/_/g, ' ')}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row: any, index: number) => (
                  <TableRow
                    key={row?.id || index}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`
                          ${column.className || ''}
                          ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                        `}
                      >
                        {renderCellContent(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length || 1}
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      {emptyStateIcon || (
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                          <Search className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <p className="text-sm font-medium">{emptyStateMessage}</p>
                      {searchTerm && (
                        <p className="text-xs mt-1">
                          Try adjusting your search or filter
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {(totalPages > 1 || Boolean(setItemsPerPage)) && (
        <div className="border-t px-1 py-2.5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={total}
            onPageChange={handlePageChange}
            pageSize={itemsPerPage}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={
              setItemsPerPage
                ? (size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

const getPaginationPages = (currentPage: number, totalPages: number) => {
  const pages: (number | string)[] = [];
  const delta = 1; // pages around current

  const left = currentPage - delta;
  const right = currentPage + delta;

  pages.push(1);

  if (left > 2) {
    pages.push("...");
  }

  for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) {
    pages.push("...");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
};