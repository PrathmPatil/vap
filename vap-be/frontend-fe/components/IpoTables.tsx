"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getIpoData } from "@/utils";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

// Types
interface IpoData {
  id: number;
  Company_Name: string;
  Close_Date: string;
  Open_Date: string;
  QIB_x_: string;
  NII_x_: string;
  Retail_x_: string;
  Applications: string;
  Total_x_: string;
  _Highlight_Row: string;
  _Issue_Open_Date: string;
  _Issue_Close_Date: string;
  _id: string;
  _URLRewrite_Folder_Name: string;
  Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_: string;
  created_at: string;
  type: "mainboard_data" | "sme_data";
}

interface IpoResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: IpoData[];
}

interface SortConfig {
  key: keyof IpoData | null;
  direction: "asc" | "desc";
}

// Sortable Table Header Component
const SortableHeader: React.FC<{
  column: string;
  sortKey: keyof IpoData;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
  className?: string;
}> = ({ column, sortKey, sortConfig, onSort, className }) => {
  return (
    <TableHead
      className={`cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {column}
        {sortConfig.key === sortKey ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </TableHead>
  );
};

// IPO Table Component
const IpoTable: React.FC<{
  data: IpoData[];
  loading: boolean;
  currentPage: number;
  recordsPerPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (value: number) => void;
  sortConfig: SortConfig;
  onSort: (key: keyof IpoData) => void;
}> = ({
  data,
  loading,
  currentPage,
  recordsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onRecordsPerPageChange,
  sortConfig,
  onSort,
}) => {
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleRecordsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onRecordsPerPageChange(parseInt(e.target.value));
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          size="sm"
          variant={currentPage === i ? "default" : "outline"}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                column="Company Name"
                sortKey="Company_Name"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Open Date"
                sortKey="Open_Date"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Close Date"
                sortKey="Close_Date"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="QIB (%)"
                sortKey="QIB_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="NII (%)"
                sortKey="NII_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Retail (%)"
                sortKey="Retail_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Applications"
                sortKey="Applications"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Total (%)"
                sortKey="Total_x_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <SortableHeader
                column="Issue Amount (Cr)"
                sortKey="Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
                sortConfig={sortConfig}
                onSort={onSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length > 0 ? (
              sortedData.map((ipo) => (
                <TableRow key={ipo.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <a
                      href={`/ipo/${ipo._URLRewrite_Folder_Name}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {ipo.Company_Name}
                    </a>
                  </TableCell>
                  <TableCell>{ipo.Open_Date}</TableCell>
                  <TableCell>{ipo.Close_Date}</TableCell>
                  <TableCell>{ipo.QIB_x_}</TableCell>
                  <TableCell>{ipo.NII_x_}</TableCell>
                  <TableCell>{ipo.Retail_x_}</TableCell>
                  <TableCell>{ipo.Applications}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {ipo.Total_x_}
                  </TableCell>
                  <TableCell>
                    {ipo.Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-gray-500"
                >
                  No IPOs available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * recordsPerPage + 1} to{" "}
            {Math.min(currentPage * recordsPerPage, totalItems)} of {totalItems}{" "}
            entries
          </div>
          <div className="flex items-center space-x-2">
            {/* Records per page */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Records per page:
              </label>
              <select
                value={recordsPerPage}
                onChange={handleRecordsPerPageChange}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            {renderPaginationButtons()}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IpoTable;
