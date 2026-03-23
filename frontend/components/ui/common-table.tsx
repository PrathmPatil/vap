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

interface CommonTableProps {
  data?: any;
  itemsPerPage?: number;
  setItemsPerPage?: (items: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export default function CommonTable({
  data,
  itemsPerPage = 10,
  setItemsPerPage,
  currentPage = 1,
  setCurrentPage,
}: CommonTableProps) {

  const safeData = Array.isArray(data) ? data : [];

  const columns = React.useMemo(() => {
    if (!safeData.length) return [];
    return Object.keys(safeData[0]);
  }, [safeData]);

  const totalPages = Math.ceil(safeData.length / itemsPerPage);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return safeData.slice(start, start + itemsPerPage);
  }, [safeData, currentPage, itemsPerPage]);

  return (
    <>
      <div className="rounded-lg border">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>

            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col} className="capitalize">
                    {col.replaceAll('_', ' ')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>

              {paginatedData.length > 0 ? (
                paginatedData.map((row: any, index: number) => (
                  <TableRow key={row?.id || index} className="hover:bg-slate-50">

                    {columns.map((col) => (
                      <TableCell key={col}>
                        {typeof row[col] === 'number'
                          ? row[col].toFixed(2)
                          : row[col]}
                      </TableCell>
                    ))}

                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length || 1}
                    className="text-center py-8 text-slate-500"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              )}

            </TableBody>

          </Table>
        </div>
      </div>

      {totalPages > 1 && (
<div className="flex items-center gap-1">

  {getPaginationPages().map((page, index) => {

    if (page === "...") {
      return (
        <span key={index} className="px-2 text-gray-500">
          ...
        </span>
      );
    }

    return (
      <Button
        key={page}
        size="sm"
        variant={page === currentPage ? "default" : "outline"}
        onClick={() => setCurrentPage(Number(page))}
        className="w-8 h-8 p-0"
      >
        {page}
      </Button>
    );
  })}

</div>
      )}
    </>
  );
}

const getPaginationPages = () => {
  const pages = [];

  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("...");

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) pages.push("...");

  pages.push(totalPages);

  return pages;
};